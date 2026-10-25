package engagement

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func LikeScroll(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	if err := likeScroll(uint(scrollID), c.GetUint("userId")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll liked", "data": gin.H{"liked": true, "likes_count": scrollCounter(uint(scrollID), "likes_count")}})
}

func UnlikeScroll(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	if err := unlikeScroll(uint(scrollID), c.GetUint("userId")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll unliked", "data": gin.H{"liked": false, "likes_count": scrollCounter(uint(scrollID), "likes_count")}})
}

func BookmarkScroll(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	if err := bookmarkScroll(uint(scrollID), c.GetUint("userId")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll bookmarked", "data": gin.H{"bookmarked": true, "bookmarks_count": scrollCounter(uint(scrollID), "bookmarks_count")}})
}

func UnbookmarkScroll(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	if err := unbookmarkScroll(uint(scrollID), c.GetUint("userId")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll unbookmarked", "data": gin.H{"bookmarked": false, "bookmarks_count": scrollCounter(uint(scrollID), "bookmarks_count")}})
}

func CreateComment(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	var input CreateCommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	comment, err := createComment(uint(scrollID), c.GetUint("userId"), input)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Comment created", "data": comment})
}

func ListComments(c *gin.Context) {
	scrollID, err := strconv.ParseUint(c.Param("idOrSlug"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	comments, pagination, err := listComments(uint(scrollID), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comments found", "data": comments, "pagination": pagination})
}

func DeleteComment(c *gin.Context) {
	commentID, err := strconv.ParseUint(c.Param("commentId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid comment id"})
		return
	}

	if err := deleteComment(c.GetUint("userId"), c.GetString("role"), uint(commentID)); err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}
