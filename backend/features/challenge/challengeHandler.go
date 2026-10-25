package challenge

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func ListChallenges(c *gin.Context) {
	scope := c.DefaultQuery("scope", "active")
	if scope != "active" && scope != "upcoming" && scope != "completed" && scope != "all" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid scope"})
		return
	}

	items, err := listChallenges(c.GetUint("userId"), c.GetString("role"), scope)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Challenges found", "data": items})
}

func GetChallenge(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid challenge id"})
		return
	}

	item, err := getChallenge(c.GetUint("userId"), c.GetString("role"), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Challenge found", "data": item})
}

func CreateChallenge(c *gin.Context) {
	var input CreateChallengeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	created, err := createChallenge(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Challenge created", "data": created})
}

func UpdateChallenge(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid challenge id"})
		return
	}

	var input UpdateChallengeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	updated, err := updateChallenge(uint(id), input)
	if err != nil {
		switch {
		case errors.Is(err, ErrChallengeNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Challenge updated", "data": updated})
}

func Submit(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid challenge id"})
		return
	}

	var input SubmitChallengeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	if err := submit(uint(id), c.GetUint("userId"), input); err != nil {
		switch {
		case errors.Is(err, ErrChallengeNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		case errors.Is(err, ErrSubmissionClosed), errors.Is(err, ErrAlreadySubmitted):
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission received"})
}

func ListSubmissions(c *gin.Context) {
	status := c.Query("status")
	items, err := listSubmissions(status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submissions found", "data": items})
}

func ReviewSubmission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid submission id"})
		return
	}

	var input ReviewSubmissionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	result, err := reviewSubmission(c.GetUint("userId"), uint(id), input)
	if err != nil {
		switch {
		case errors.Is(err, ErrSubmissionNotFound), errors.Is(err, ErrChallengeNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		case errors.Is(err, ErrNotPending):
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		case errors.Is(err, ErrCannotReviewOwn):
			c.JSON(http.StatusForbidden, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Submission reviewed", "data": result})
}
