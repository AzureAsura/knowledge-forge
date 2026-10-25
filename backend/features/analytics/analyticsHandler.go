package analytics

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetMe(c *gin.Context) {
	w, ok := windowFor(c)
	if !ok {
		return
	}
	data, err := getMe(c.GetUint("userId"), w)
	respond(c, data, err)
}

func GetMentor(c *gin.Context) {
	w, ok := windowFor(c)
	if !ok {
		return
	}
	data, err := getMentor(c.GetUint("userId"), w)
	respond(c, data, err)
}

func GetPlatform(c *gin.Context) {
	w, ok := windowFor(c)
	if !ok {
		return
	}
	data, err := getPlatform(w)
	respond(c, data, err)
}

func windowFor(c *gin.Context) (window, bool) {
	w, ok := newWindow(c.DefaultQuery("range", "month"))
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid range"})
	}
	return w, ok
}

func respond(c *gin.Context, data any, err error) {
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Analytics found", "data": data})
}
