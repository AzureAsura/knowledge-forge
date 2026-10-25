package auth

import (
	"errors"
	"log"
	"mime/multipart"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"

	"github.com/google/uuid"
)

func login(input LoginInput) (string, string, error) {
	var user model.User
	if err := config.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return "", "", errors.New("invalid email or password")
	}

	if !user.IsActive {
		return "", "", errors.New("account is disabled")
	}

	if !utils.CheckPasswordHash(input.Password, user.PasswordHash) {
		return "", "", errors.New("invalid email or password")
	}

	access, refresh, _, err := issueTokenPair(user, uuid.NewString())
	if err != nil {
		return "", "", err
	}

	if _, touchErr := gamification.Touch(user.ID, "daily_login", time.Now()); touchErr != nil {
		log.Println("Failed to touch daily_login streak:", touchErr)
	}

	return access, refresh, nil
}

func refresh(plainRefreshToken string) (string, string, error) {
	hash := utils.HashToken(plainRefreshToken)

	var stored model.RefreshToken
	if err := config.DB.Where("token_hash = ?", hash).First(&stored).Error; err != nil {
		return "", "", errors.New("invalid refresh token")
	}

	if stored.RevokedAt != nil {
		config.DB.Model(&model.RefreshToken{}).
			Where("family_id = ? AND revoked_at IS NULL", stored.FamilyID).
			Update("revoked_at", time.Now())
		return "", "", errors.New("token reuse detected, please login again")
	}

	if time.Now().After(stored.ExpiresAt) {
		return "", "", errors.New("refresh token expired")
	}

	var user model.User
	if err := config.DB.First(&user, stored.UserID).Error; err != nil || !user.IsActive {
		return "", "", errors.New("account is disabled")
	}

	newAccess, newRefresh, newRefreshID, err := issueTokenPair(user, stored.FamilyID)
	if err != nil {
		return "", "", err
	}

	config.DB.Model(&stored).Updates(map[string]any{"revoked_at": time.Now(), "replaced_by": newRefreshID})

	return newAccess, newRefresh, nil
}

func logout(plainRefreshToken string) error {
	hash := utils.HashToken(plainRefreshToken)

	var stored model.RefreshToken
	if err := config.DB.Where("token_hash = ?", hash).First(&stored).Error; err != nil {
		return nil
	}

	return config.DB.Model(&model.RefreshToken{}).
		Where("family_id = ? AND revoked_at IS NULL", stored.FamilyID).
		Update("revoked_at", time.Now()).Error
}

func getMe(userID uint) (model.User, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return model.User{}, err
	}

	level, title, _, xpForNext := utils.LevelFromTotalXP(user.TotalXP)
	user.CurrentLevel = level
	user.Title = title
	user.XPForNextLevel = xpForNext

	return user, nil
}

func changePassword(userID uint, input ChangePasswordInput) error {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return errors.New("user not found")
	}
	if !utils.CheckPasswordHash(input.CurrentPassword, user.PasswordHash) {
		return errors.New("current password is incorrect")
	}

	hashed, err := utils.HashPassword(input.NewPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hashed
	if err := config.DB.Save(&user).Error; err != nil {
		return err
	}

	config.DB.Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", time.Now())

	return nil
}

func updateAvatar(userID uint, file *multipart.FileHeader) (model.User, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return model.User{}, errors.New("user not found")
	}

	url, publicID, err := utils.UploadImage(file, "avatars")
	if err != nil {
		return model.User{}, err
	}

	oldPublicID := user.AvatarPublicID
	user.AvatarURL = url
	user.AvatarPublicID = publicID
	if err := config.DB.Save(&user).Error; err != nil {
		return model.User{}, err
	}
	if oldPublicID != "" {
		utils.DeleteImage(oldPublicID)
	}

	return user, nil
}

func issueTokenPair(user model.User, familyID string) (string, string, uint, error) {
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return "", "", 0, err
	}

	plainRefresh, hashedRefresh, err := utils.GenerateRefreshToken()
	if err != nil {
		return "", "", 0, err
	}

	record := model.RefreshToken{
		UserID:    user.ID,
		FamilyID:  familyID,
		TokenHash: hashedRefresh,
		ExpiresAt: time.Now().Add(utils.RefreshTokenTTL),
	}
	if err := config.DB.Create(&record).Error; err != nil {
		return "", "", 0, err
	}

	return accessToken, plainRefresh, record.ID, nil
}
