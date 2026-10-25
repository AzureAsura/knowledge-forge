package engagement

import (
	"errors"
	"fmt"
	"log"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/view"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrCommentNotFound = errors.New("comment not found")

const (
	xpLikeReceived        = 5
	maxLikeReceivedXP     = 50
	xpBookmarkReceived    = 10
	xpTopicBookmark       = 2
	dailyCapTopicBookmark = 20
	xpCommentCreated      = 5
	dailyCapComment       = 30
)

func likeScroll(scrollID, userID uint) error {
	var authorID, likeID uint
	shouldAward := false

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		var scroll model.Scroll
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&scroll, scrollID).Error; err != nil || scroll.Status != model.ScrollStatusPublished {
			return errors.New("scroll not found")
		}
		authorID = scroll.AuthorID

		var existing model.Like
		if err := tx.Where("scroll_id = ? AND user_id = ?", scrollID, userID).First(&existing).Error; err == nil {
			return nil
		}

		like := model.Like{ScrollID: scrollID, UserID: userID}
		if err := tx.Create(&like).Error; err != nil {
			return err
		}
		likeID = like.ID

		newCount := scroll.LikesCount + 1
		if err := tx.Model(&scroll).Update("likes_count", newCount).Error; err != nil {
			return err
		}
		shouldAward = scroll.AuthorID != userID && newCount <= maxLikeReceivedXP/xpLikeReceived
		return nil
	})
	if err != nil {
		return err
	}

	if shouldAward {
		if _, awardErr := gamification.Award(authorID, xpLikeReceived, "scroll_liked", "like", likeID); awardErr != nil {
			log.Println("Failed to award like XP:", awardErr)
		}
	}
	return nil
}

func unlikeScroll(scrollID, userID uint) error {
	result := config.DB.Where("scroll_id = ? AND user_id = ?", scrollID, userID).Delete(&model.Like{})
	if result.RowsAffected > 0 {
		config.DB.Model(&model.Scroll{}).Where("id = ?", scrollID).UpdateColumn("likes_count", gorm.Expr("likes_count - ?", 1))
	}
	return nil
}

func bookmarkScroll(scrollID, userID uint) error {
	var authorID, categoryID, bookmarkID uint
	isNew := false

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		var scroll model.Scroll
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&scroll, scrollID).Error; err != nil || scroll.Status != model.ScrollStatusPublished {
			return errors.New("scroll not found")
		}
		authorID = scroll.AuthorID
		categoryID = scroll.CategoryID

		var existing model.Bookmark
		if err := tx.Where("scroll_id = ? AND user_id = ?", scrollID, userID).First(&existing).Error; err == nil {
			return nil
		}

		bookmark := model.Bookmark{ScrollID: scrollID, UserID: userID}
		if err := tx.Create(&bookmark).Error; err != nil {
			return err
		}
		bookmarkID = bookmark.ID
		isNew = true
		return tx.Model(&scroll).Update("bookmarks_count", scroll.BookmarksCount+1).Error
	})
	if err != nil {
		return err
	}

	if isNew && authorID != userID {
		if _, awardErr := gamification.Award(authorID, xpBookmarkReceived, "scroll_bookmarked", "bookmark", bookmarkID); awardErr != nil {
			log.Println("Failed to award bookmark XP:", awardErr)
		}
		if granted, capErr := gamification.Consume(authorID, fmt.Sprintf("topic_bookmark:%d", categoryID), xpTopicBookmark, dailyCapTopicBookmark); capErr != nil {
			log.Println("Failed to consume topic-bookmark daily cap:", capErr)
		} else if granted > 0 {
			if err := gamification.AddTopicXP(authorID, categoryID, granted); err != nil {
				log.Println("Failed to add topic XP for bookmark:", err)
			}
			if _, err := gamification.CheckTopicLevelUp(authorID, categoryID); err != nil {
				log.Println("Failed to check topic level up for bookmark:", err)
			}
		}
		if _, evalErr := gamification.Evaluate(authorID, "scroll_bookmarks"); evalErr != nil {
			log.Println("Failed to evaluate badges for bookmark:", evalErr)
		}
	}
	return nil
}

func unbookmarkScroll(scrollID, userID uint) error {
	result := config.DB.Where("scroll_id = ? AND user_id = ?", scrollID, userID).Delete(&model.Bookmark{})
	if result.RowsAffected > 0 {
		config.DB.Model(&model.Scroll{}).Where("id = ?", scrollID).UpdateColumn("bookmarks_count", gorm.Expr("bookmarks_count - ?", 1))
	}
	return nil
}

func createComment(scrollID, authorID uint, input CreateCommentInput) (view.CommentItem, error) {
	var scroll model.Scroll
	if err := config.DB.First(&scroll, scrollID).Error; err != nil || scroll.Status != model.ScrollStatusPublished {
		return view.CommentItem{}, errors.New("scroll not found")
	}

	comment := model.Comment{ScrollID: scrollID, AuthorID: authorID, Content: input.Content}
	if err := config.DB.Create(&comment).Error; err != nil {
		return view.CommentItem{}, err
	}
	config.DB.Model(&model.Scroll{}).Where("id = ?", scrollID).UpdateColumn("comments_count", gorm.Expr("comments_count + ?", 1))

	if scroll.AuthorID != authorID {
		if granted, capErr := gamification.Consume(authorID, "comment", xpCommentCreated, dailyCapComment); capErr != nil {
			log.Println("Failed to consume comment daily cap:", capErr)
		} else if granted > 0 {
			if _, awardErr := gamification.Award(authorID, granted, "comment_created", "comment", comment.ID); awardErr != nil {
				log.Println("Failed to award comment XP:", awardErr)
			}
		}
		if _, evalErr := gamification.Evaluate(authorID, "comment_count"); evalErr != nil {
			log.Println("Failed to evaluate badges for comment:", evalErr)
		}
	}

	items, err := view.Comments([]model.Comment{comment})
	if err != nil {
		return view.CommentItem{}, err
	}
	return items[0], nil
}

func listComments(scrollID uint, page, limit int) ([]view.CommentItem, model.Pagination, error) {
	page = max(page, 1)
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	var total int64
	if err := config.DB.Model(&model.Comment{}).Where("scroll_id = ?", scrollID).Count(&total).Error; err != nil {
		return nil, model.Pagination{}, err
	}

	var comments []model.Comment
	err := config.DB.Where("scroll_id = ?", scrollID).Order("created_at asc").Limit(limit).Offset((page - 1) * limit).Find(&comments).Error
	if err != nil {
		return nil, model.Pagination{}, err
	}

	items, err := view.Comments(comments)
	if err != nil {
		return nil, model.Pagination{}, err
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := model.Pagination{Page: page, Limit: limit, Total: total, TotalPages: totalPages}

	return items, pagination, nil
}

func scrollCounter(scrollID uint, column string) int {
	var n int
	config.DB.Model(&model.Scroll{}).Where("id = ?", scrollID).Select(column).Scan(&n)
	return n
}

func deleteComment(callerID uint, callerRole string, commentID uint) error {
	var comment model.Comment
	if err := config.DB.First(&comment, commentID).Error; err != nil {
		return ErrCommentNotFound
	}

	if callerRole != model.RoleAdmin && comment.AuthorID != callerID {
		return errors.New("not allowed to delete this comment")
	}

	if err := config.DB.Delete(&comment).Error; err != nil {
		return err
	}
	config.DB.Model(&model.Scroll{}).Where("id = ?", comment.ScrollID).UpdateColumn("comments_count", gorm.Expr("comments_count - ?", 1))

	return nil
}
