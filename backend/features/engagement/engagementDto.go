package engagement

type CreateCommentInput struct {
	Content string `json:"content" binding:"required,min=1,max=2000"`
}
