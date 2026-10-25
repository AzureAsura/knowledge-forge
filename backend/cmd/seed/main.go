package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"
)

// Without -reset only the categories are ensured (the old behaviour).
// With -reset every other table is emptied and a 120-day history of a lively team is replayed: go run ./cmd/seed -reset
const seedPassword = "KnoFoDemo#2026"

func main() {
	reset := flag.Bool("reset", false, "wipe everything except categories and seed demo data (development only)")
	yes := flag.Bool("yes", false, "skip the RESET confirmation")
	offline := flag.Bool("skip-image-check", false, "do not GET every image URL first")
	flag.Parse()

	config.ConnectDB()
	seedCategories()
	if !*reset {
		return
	}
	if os.Getenv("APP_ENV") != "development" {
		log.Fatal("-reset needs APP_ENV=development")
	}

	jkt = gamification.JakartaLocation()
	nowT = time.Now().In(jkt)
	drafts := loadDrafts()
	if !*offline {
		checkImages(drafts)
	}

	fmt.Print("About to delete:\n", rowCounts(), "Type RESET to continue: ")
	if !*yes {
		line, _ := bufio.NewReader(os.Stdin).ReadString('\n')
		if strings.TrimSpace(line) != "RESET" {
			log.Fatal("aborted")
		}
	}
	if os.Getenv("CLOUDINARY_CLOUD_NAME") != "" {
		config.ConnectCloudinary()
	}
	wipe()

	s := newSim(42)
	var cats []model.Category
	config.DB.Find(&cats)
	for _, c := range cats {
		s.cats[c.Slug] = c.ID
	}
	hash, err := utils.HashPassword(seedPassword)
	if err != nil {
		log.Fatal(err)
	}
	admin := persona{os.Getenv("ADMIN_NAME"), os.Getenv("ADMIN_USERNAME"), "admin", "Platform administrator for KnoFo.", toon + "notionists/svg?seed=KnoFoAdmin&backgroundColor=d1d4f9", 178, "", 0, 20, 0.6, 0.8}
	if admin.FullName == "" || admin.Username == "" || os.Getenv("ADMIN_EMAIL") == "" || os.Getenv("ADMIN_PASSWORD") == "" {
		log.Fatal("ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env")
	}
	s.buildUsers(hash, admin)
	adminHash, err := utils.HashPassword(os.Getenv("ADMIN_PASSWORD"))
	if err != nil {
		log.Fatal(err)
	}
	s.users[0].PasswordHash, s.users[0].Email = adminHash, os.Getenv("ADMIN_EMAIL")
	s.buildScrolls(drafts)
	s.generate()
	s.challenges()
	s.grants()
	s.visitsGen()
	s.run()
	s.flush()
	verify()
	printAccounts(s)
}

func printAccounts(s *sim) {
	fmt.Printf("\n%-8s %-22s %-14s %-28s lvl %5s\n", "role", "name", "username", "email", "xp")
	for _, u := range s.users {
		fmt.Printf("%-8s %-22s %-14s %-28s %3d %5d\n", u.Role, u.FullName, u.Username, u.Email, u.CurrentLevel, u.TotalXP)
	}
}

func seedCategories() {
	web := ensureCategory("Web", "web", "Pengembangan web, frontend dan backend", nil)
	unity := ensureCategory("Unity", "unity", "Game development dengan Unity Engine", nil)

	ensureCategory("Web Frontend", "web-frontend", "HTML, CSS, JavaScript, React, Vite", &web.ID)
	ensureCategory("Web Backend", "web-backend", "API, Database, Go, Auth", &web.ID)
	ensureCategory("Unity 2D", "unity-2d", "2D Game Development, URP, Sprite, Animation", &unity.ID)
	ensureCategory("Unity VR", "unity-vr", "VR Development, Meta Quest, Interaction, XR", &unity.ID)
	ensureCategory("Design & UI", "design-ui", "Figma, UI/UX, Wireframe, Prototyping", nil)
	ensureCategory("Project Management", "project-management", "Client Handling, SOP, Workflow, Tools", nil)

	log.Println("categories ensured")
}

func ensureCategory(name, slug, description string, parentID *uint) model.Category {
	var cat model.Category
	if err := config.DB.Where("slug = ?", slug).First(&cat).Error; err == nil {
		if !samePtr(cat.ParentID, parentID) {
			cat.ParentID = parentID
			config.DB.Save(&cat)
		}
		return cat
	}

	cat = model.Category{Name: name, Slug: slug, Description: description, ParentID: parentID, IsActive: true}
	if err := config.DB.Create(&cat).Error; err != nil {
		log.Fatal("Failed to seed category", slug, err)
	}
	return cat
}

func samePtr(a, b *uint) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}
