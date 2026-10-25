package scroll

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func CreateScroll(c *gin.Context) {
	var input CreateScrollInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	scroll, err := createScroll(c.GetUint("userId"), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Scroll created", "data": scroll})
}

func ListScrolls(c *gin.Context) {
	var query ScrollListQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	scrolls, pagination, err := listScrolls(c.GetUint("userId"), c.GetString("role"), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scrolls found", "data": scrolls, "pagination": pagination})
}

func GetScroll(c *gin.Context) {
	scroll, err := getScroll(c.GetUint("userId"), c.GetString("role"), c.Param("idOrSlug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll found", "data": scroll})
}

func UpdateScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	var input UpdateScrollInput
	if err := c.ShouldBind(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	scroll, err := updateScroll(c.GetUint("userId"), c.GetString("role"), uint(id), input)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll updated", "data": scroll})
}

func DeleteScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	if err := deleteScroll(c.GetUint("userId"), c.GetString("role"), uint(id)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll deleted"})
}

func SubmitScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, err := submitScroll(c.GetUint("userId"), uint(id))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll submitted for review", "data": scroll})
}

func ApproveScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, summary, err := approveScroll(c.GetUint("userId"), c.GetString("role"), uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ErrScrollNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		case errors.Is(err, ErrScrollNotPending):
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll approved", "data": scroll, "gamification": summary})
}

func RejectScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, err := rejectScroll(c.GetUint("userId"), c.GetString("role"), uint(id))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll rejected", "data": scroll})
}

func ArchiveScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, err := archiveScroll(c.GetUint("userId"), c.GetString("role"), uint(id))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll archived", "data": scroll})
}

func FeatureScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, err := featureScroll(c.GetString("role"), uint(id))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll featured", "data": scroll})
}

func UnfeatureScroll(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scroll id"})
		return
	}

	scroll, err := unfeatureScroll(c.GetString("role"), uint(id))
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scroll unfeatured", "data": scroll})
}
