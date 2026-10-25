package scroll

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"
	"backend/shared/view"

	"gorm.io/gorm"
)

const (
	xpScrollPublished = 50
	xpTopicPublish    = 30
	xpScrollRead      = 2
	dailyCapRead      = 20
	xpTopicRead       = 5
	dailyCapTopicRead = 50
	xpMentorPassive   = 20
)

var (
	ErrScrollNotFound   = errors.New("scroll not found")
	ErrScrollNotPending = errors.New("only pending scrolls can be approved")
)

var scrollSortColumns = map[string]string{
	"created_at":      "created_at",
	"title":           "title",
	"likes_count":     "likes_count",
	"view_count":      "view_count",
	"comments_count":  "comments_count",
	"bookmarks_count": "bookmarks_count",
}

func createScroll(authorID uint, input CreateScrollInput) (model.Scroll, error) {
	slug, err := generateUniqueSlug(input.Title)
	if err != nil {
		return model.Scroll{}, err
	}

	excerpt := input.Excerpt
	if excerpt == "" {
		excerpt = buildExcerpt(input.Content)
	}

	difficulty := input.Difficulty
	if difficulty == "" {
		difficulty = model.DifficultyBeginner
	}

	scroll := model.Scroll{
		AuthorID:   authorID,
		CategoryID: input.CategoryID,
		Title:      input.Title,
		Slug:       slug,
		Excerpt:    excerpt,
		Content:    input.Content,
		Difficulty: difficulty,
		Status:     model.ScrollStatusDraft,
	}

	if input.CoverImage != nil {
		if input.CoverImage.Size > utils.MaxImageSize {
			return model.Scroll{}, errors.New("cover image exceeds 4MB limit")
		}
		url, publicID, err := utils.UploadImage(input.CoverImage, "scroll-covers")
		if err != nil {
			return model.Scroll{}, err
		}
		scroll.CoverImageURL = url
		scroll.CoverImagePublicID = publicID
	}

	if err := config.DB.Create(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func listScrolls(callerID uint, callerRole string, q ScrollListQuery) ([]view.ScrollItem, model.Pagination, error) {
	query := config.DB.Model(&model.Scroll{})

	if q.Mine {
		query = query.Where("author_id = ?", callerID)
		if q.Status != "" {
			query = query.Where("status = ?", q.Status)
		}
	} else {
		switch q.Status {
		case "", model.ScrollStatusPublished:
			query = query.Where("status = ?", model.ScrollStatusPublished)
		case model.ScrollStatusPending:
			if callerRole == model.RoleSenior || callerRole == model.RoleAdmin {
				query = query.Where("status = ?", model.ScrollStatusPending)
			} else {
				query = query.Where("status = ? AND author_id = ?", model.ScrollStatusPending, callerID)
			}
		default:
			query = query.Where("status = ? AND author_id = ?", q.Status, callerID)
		}
	}

	if q.CategoryID != 0 {
		query = query.Where("category_id = ?", q.CategoryID)
	}
	if q.Author != "" {
		query = query.Where("author_id IN (SELECT id FROM users WHERE username = ?)", q.Author)
	}
	if q.Difficulty != "" {
		query = query.Where("difficulty = ?", q.Difficulty)
	}
	if q.Bookmarked {
		query = query.Where("id IN (SELECT scroll_id FROM bookmarks WHERE user_id = ?)", callerID)
	}
	if q.Liked {
		query = query.Where("id IN (SELECT scroll_id FROM likes WHERE user_id = ?)", callerID)
	}
	if q.Search != "" {
		query = query.Where("title ILIKE ?", "%"+q.Search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, model.Pagination{}, err
	}

	page := max(q.Page, 1)
	limit := q.Limit
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	var scrolls []model.Scroll
	err := query.Order(resolveScrollSort(q.Sort)).Limit(limit).Offset((page - 1) * limit).Find(&scrolls).Error
	if err != nil {
		return nil, model.Pagination{}, err
	}

	items, err := view.Scrolls(scrolls)
	if err != nil {
		return nil, model.Pagination{}, err
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := model.Pagination{Page: page, Limit: limit, Total: total, TotalPages: totalPages}

	return items, pagination, nil
}

func resolveScrollSort(sort string) string {
	direction := "ASC"
	col := sort
	if strings.HasPrefix(sort, "-") {
		direction = "DESC"
		col = sort[1:]
	}

	column, ok := scrollSortColumns[col]
	if !ok {
		return "created_at DESC"
	}
	return column + " " + direction
}

func getScroll(callerID uint, callerRole string, idOrSlug string) (ScrollDetail, error) {
	var scroll model.Scroll
	query := config.DB
	if id, err := strconv.ParseUint(idOrSlug, 10, 64); err == nil {
		query = query.Where("id = ?", id)
	} else {
		query = query.Where("slug = ?", idOrSlug)
	}

	if err := query.First(&scroll).Error; err != nil {
		return ScrollDetail{}, errors.New("scroll not found")
	}

	allowed := false
	if scroll.Status == model.ScrollStatusPublished {
		var existingRead model.ScrollRead
		if err := config.DB.Where("scroll_id = ? AND user_id = ?", scroll.ID, callerID).First(&existingRead).Error; err != nil {
			read := model.ScrollRead{ScrollID: scroll.ID, UserID: callerID, FirstReadAt: time.Now()}
			if err := config.DB.Create(&read).Error; err == nil {
				config.DB.Model(&scroll).UpdateColumn("view_count", gorm.Expr("view_count + ?", 1))
				scroll.ViewCount++

				if _, touchErr := gamification.Touch(callerID, "daily_read", time.Now()); touchErr != nil {
					log.Println("Failed to touch daily_read streak:", touchErr)
				}

				if scroll.AuthorID != callerID {
					if granted, capErr := gamification.Consume(callerID, "read", xpScrollRead, dailyCapRead); capErr != nil {
						log.Println("Failed to consume read daily cap:", capErr)
					} else if granted > 0 {
						if _, awardErr := gamification.Award(callerID, granted, "scroll_read", "reading", scroll.ID); awardErr != nil {
							log.Println("Failed to award read XP:", awardErr)
						}
					}

					if granted, capErr := gamification.Consume(callerID, fmt.Sprintf("topic_read:%d", scroll.CategoryID), xpTopicRead, dailyCapTopicRead); capErr != nil {
						log.Println("Failed to consume topic-read daily cap:", capErr)
					} else if granted > 0 {
						if err := gamification.AddTopicXP(callerID, scroll.CategoryID, granted); err != nil {
							log.Println("Failed to add topic XP for read:", err)
						}
					}
					if err := gamification.IncRead(callerID, scroll.CategoryID); err != nil {
						log.Println("Failed to increment topic read count:", err)
					}
					if _, err := gamification.CheckTopicLevelUp(callerID, scroll.CategoryID); err != nil {
						log.Println("Failed to check topic level up for read:", err)
					}
				}
			}
		}
		allowed = true
	} else if scroll.AuthorID == callerID {
		allowed = true
	} else if scroll.Status == model.ScrollStatusPending && (callerRole == model.RoleSenior || callerRole == model.RoleAdmin) {
		allowed = true
	}

	if !allowed {
		return ScrollDetail{}, errors.New("scroll not found")
	}

	var likeCount, bookmarkCount int64
	config.DB.Model(&model.Like{}).Where("scroll_id = ? AND user_id = ?", scroll.ID, callerID).Count(&likeCount)
	config.DB.Model(&model.Bookmark{}).Where("scroll_id = ? AND user_id = ?", scroll.ID, callerID).Count(&bookmarkCount)

	items, err := view.Scrolls([]model.Scroll{scroll})
	if err != nil {
		return ScrollDetail{}, err
	}

	return ScrollDetail{ScrollItem: items[0], IsLiked: likeCount > 0, IsBookmarked: bookmarkCount > 0}, nil
}

func updateScroll(callerID uint, callerRole string, id uint, input UpdateScrollInput) (model.Scroll, error) {
	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}

	isOwner := scroll.AuthorID == callerID
	if callerRole != model.RoleAdmin && !(isOwner && scroll.Status == model.ScrollStatusDraft) {
		return model.Scroll{}, errors.New("not allowed to edit this scroll")
	}

	if input.Title != nil {
		scroll.Title = *input.Title
	}
	if input.CategoryID != nil {
		scroll.CategoryID = *input.CategoryID
	}
	if input.Content != nil {
		scroll.Content = *input.Content
	}
	if input.Excerpt != nil {
		scroll.Excerpt = *input.Excerpt
	}
	if input.Difficulty != nil {
		scroll.Difficulty = *input.Difficulty
	}

	if input.CoverImage != nil {
		if input.CoverImage.Size > utils.MaxImageSize {
			return model.Scroll{}, errors.New("cover image exceeds 4MB limit")
		}
		url, publicID, err := utils.UploadImage(input.CoverImage, "scroll-covers")
		if err != nil {
			return model.Scroll{}, err
		}
		oldPublicID := scroll.CoverImagePublicID
		scroll.CoverImageURL = url
		scroll.CoverImagePublicID = publicID
		if oldPublicID != "" {
			utils.DeleteImage(oldPublicID)
		}
	} else if input.RemoveCoverImage && scroll.CoverImagePublicID != "" {
		oldPublicID := scroll.CoverImagePublicID
		scroll.CoverImageURL = ""
		scroll.CoverImagePublicID = ""
		utils.DeleteImage(oldPublicID)
	}

	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func deleteScroll(callerID uint, callerRole string, id uint) error {
	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return errors.New("scroll not found")
	}

	isOwner := scroll.AuthorID == callerID
	if callerRole != model.RoleAdmin && !(isOwner && scroll.Status == model.ScrollStatusDraft) {
		return errors.New("not allowed to delete this scroll")
	}

	return config.DB.Delete(&scroll).Error
}

func submitScroll(callerID uint, id uint) (model.Scroll, error) {
	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}

	if scroll.AuthorID != callerID {
		return model.Scroll{}, errors.New("not allowed to submit this scroll")
	}
	if scroll.Status != model.ScrollStatusDraft {
		return model.Scroll{}, errors.New("only draft scrolls can be submitted")
	}

	scroll.Status = model.ScrollStatusPending
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func approveScroll(callerID uint, callerRole string, id uint) (model.Scroll, PublishSummary, error) {
	if callerRole != model.RoleSenior && callerRole != model.RoleAdmin {
		return model.Scroll{}, PublishSummary{}, errors.New("not allowed to approve scrolls")
	}

	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, PublishSummary{}, ErrScrollNotFound
	}
	if scroll.Status != model.ScrollStatusPending {
		return model.Scroll{}, PublishSummary{}, ErrScrollNotPending
	}
	if scroll.AuthorID == callerID {
		return model.Scroll{}, PublishSummary{}, errors.New("cannot approve your own scroll")
	}

	now := time.Now()
	scroll.Status = model.ScrollStatusPublished
	scroll.PublishedAt = &now
	scroll.ReviewedByID = &callerID
	scroll.ReviewedAt = &now
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, PublishSummary{}, err
	}

	var author model.User
	config.DB.First(&author, scroll.AuthorID)
	summary := PublishSummary{NewLevel: author.CurrentLevel, NewBadges: []gamification.UnlockResult{}}

	if author.MentorID != nil {
		var publishedCount int64
		config.DB.Model(&model.Scroll{}).Where("author_id = ? AND status = ?", scroll.AuthorID, model.ScrollStatusPublished).Count(&publishedCount)
		if publishedCount == 1 {
			var mentor model.User
			if err := config.DB.Where("id = ? AND is_active = ?", *author.MentorID, true).First(&mentor).Error; err == nil {
				if _, err := gamification.Award(mentor.ID, xpMentorPassive, "mentor_pasif", "mentor", scroll.AuthorID); err != nil {
					log.Println("Failed to award mentor passive XP:", err)
				}
			}
		}
	}

	track := func(leveledUp bool, newLevel int) {
		if leveledUp {
			summary.LevelUp = true
		}
		summary.NewLevel = newLevel
	}

	if result, err := gamification.Award(scroll.AuthorID, xpScrollPublished, "scroll_published", "scroll", scroll.ID); err != nil {
		log.Println("Failed to award XP for scroll publish:", err)
	} else {
		if result.Applied {
			summary.XPGained += result.XPGained
		}
		track(result.LeveledUp, result.NewLevel)
	}

	if err := gamification.AddTopicXP(scroll.AuthorID, scroll.CategoryID, xpTopicPublish); err != nil {
		log.Println("Failed to add topic XP for scroll publish:", err)
	}
	if err := gamification.IncContributed(scroll.AuthorID, scroll.CategoryID); err != nil {
		log.Println("Failed to increment topic contributed count:", err)
	}
	if topicResult, err := gamification.CheckTopicLevelUp(scroll.AuthorID, scroll.CategoryID); err != nil {
		log.Println("Failed to check topic level up:", err)
	} else {
		summary.XPGained += topicResult.BonusXP
		if topicResult.UserNewLevel > 0 {
			track(topicResult.UserLevelUp, topicResult.UserNewLevel)
		}
		if topicResult.LevelUp {
			summary.TopicLevelUp = &topicResult
		}
	}

	if newBadges, err := gamification.Evaluate(scroll.AuthorID, "scroll_count", "category_count", "streak"); err != nil {
		log.Println("Failed to evaluate badges for scroll publish:", err)
	} else {
		for _, b := range newBadges {
			summary.XPGained += b.XPReward
			summary.NewBadges = append(summary.NewBadges, b)
			track(b.LevelUp, b.NewLevel)
		}
	}

	if _, err := gamification.Touch(scroll.AuthorID, "weekly_scroll", time.Now()); err != nil {
		log.Println("Failed to touch weekly_scroll streak:", err)
	}

	return scroll, summary, nil
}

func rejectScroll(callerID uint, callerRole string, id uint) (model.Scroll, error) {
	if callerRole != model.RoleSenior && callerRole != model.RoleAdmin {
		return model.Scroll{}, errors.New("not allowed to reject scrolls")
	}

	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}
	if scroll.Status != model.ScrollStatusPending {
		return model.Scroll{}, errors.New("only pending scrolls can be rejected")
	}
	if callerRole == model.RoleSenior && scroll.AuthorID == callerID {
		return model.Scroll{}, errors.New("cannot reject your own scroll")
	}

	scroll.Status = model.ScrollStatusDraft
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func archiveScroll(callerID uint, callerRole string, id uint) (model.Scroll, error) {
	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}

	isOwner := scroll.AuthorID == callerID
	if callerRole != model.RoleAdmin && !(isOwner && scroll.Status == model.ScrollStatusPublished) {
		return model.Scroll{}, errors.New("not allowed to archive this scroll")
	}

	scroll.Status = model.ScrollStatusArchived
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func featureScroll(callerRole string, id uint) (model.Scroll, error) {
	if callerRole != model.RoleAdmin {
		return model.Scroll{}, errors.New("not allowed to feature scrolls")
	}

	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}
	if scroll.Status != model.ScrollStatusPublished {
		return model.Scroll{}, errors.New("only published scrolls can be featured")
	}

	scroll.IsFeatured = true
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func unfeatureScroll(callerRole string, id uint) (model.Scroll, error) {
	if callerRole != model.RoleAdmin {
		return model.Scroll{}, errors.New("not allowed to unfeature scrolls")
	}

	var scroll model.Scroll
	if err := config.DB.First(&scroll, id).Error; err != nil {
		return model.Scroll{}, errors.New("scroll not found")
	}

	scroll.IsFeatured = false
	if err := config.DB.Save(&scroll).Error; err != nil {
		return model.Scroll{}, err
	}

	return scroll, nil
}

func generateUniqueSlug(title string) (string, error) {
	base := utils.Slugify(title)
	slug := base
	for i := 2; ; i++ {
		var count int64
		if err := config.DB.Model(&model.Scroll{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
}

func buildExcerpt(content string) string {
	runes := []rune(content)
	if len(runes) <= 200 {
		return content
	}
	return string(runes[:200]) + "..."
}
