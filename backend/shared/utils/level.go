package utils

import (
	"math"
	"os"
	"strconv"
)

const MaxLevel = 50

var titleTiers = []struct {
	MinLevel int
	Title    string
}{
	{50, "KnoFo Elder"},
	{40, "Legend"},
	{35, "Oracle"},
	{30, "Grand Sage"},
	{25, "Master Archivist"},
	{20, "Senior Lorekeeper"},
	{15, "Adept Keeper"},
	{10, "Journeyman Scribe"},
	{5, "Apprentice Sage"},
	{1, "Novice Scholar"},
}

func levelBase() float64 {
	if v, err := strconv.ParseFloat(os.Getenv("XP_LEVEL_BASE"), 64); err == nil {
		return v
	}
	return 100
}

func levelExponent() float64 {
	if v, err := strconv.ParseFloat(os.Getenv("XP_LEVEL_EXPONENT"), 64); err == nil {
		return v
	}
	return 1.5
}

func XPToNextLevel(level int) int {
	return int(math.Floor(levelBase() * math.Pow(float64(level), levelExponent())))
}

func TitleForLevel(level int) string {
	for _, t := range titleTiers {
		if level >= t.MinLevel {
			return t.Title
		}
	}
	return titleTiers[len(titleTiers)-1].Title
}

func LevelFromTotalXP(totalXP int) (level int, title string, xpIntoLevel int, xpForNextLevel int) {
	level = 1
	remaining := totalXP
	for level < MaxLevel {
		need := XPToNextLevel(level)
		if remaining < need {
			break
		}
		remaining -= need
		level++
	}

	xpIntoLevel = remaining
	if level < MaxLevel {
		xpForNextLevel = XPToNextLevel(level)
	}
	title = TitleForLevel(level)
	return
}
