package utils

import (
	"context"
	"errors"
	"mime/multipart"

	"backend/config"

	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

const MaxImageSize = 4 * 1024 * 1024

func UploadImage(file *multipart.FileHeader, folder string) (string, string, error) {
	src, err := file.Open()
	if err != nil {
		return "", "", err
	}
	defer src.Close()

	result, err := config.Cloudinary.Upload.Upload(context.Background(), src, uploader.UploadParams{
		Folder: folder,
	})
	if err != nil {
		return "", "", err
	}
	if result.Error.Message != "" {
		return "", "", errors.New(result.Error.Message)
	}

	return result.SecureURL, result.PublicID, nil
}

func DeleteImage(publicID string) error {
	if publicID == "" {
		return nil
	}

	_, err := config.Cloudinary.Upload.Destroy(context.Background(), uploader.DestroyParams{
		PublicID: publicID,
	})
	return err
}
