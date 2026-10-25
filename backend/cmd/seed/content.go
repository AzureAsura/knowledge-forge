package main

import (
	"embed"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed content/*.md
var contentFS embed.FS

type draftComment struct{ Author, Text string }

type draft struct {
	File                                string
	Title, Author, Category, Difficulty string
	Status                              string
	Age                                 int // days ago published (pending: submitted, draft: created)
	Featured                            bool
	Cover, Body                         string
	Comments                            []draftComment
}

const unsplash = "https://images.unsplash.com/photo-"

var shorthand = regexp.MustCompile(`unsplash:([0-9]+-[0-9a-f]+)`)

func expandImages(s string) string {
	return shorthand.ReplaceAllString(s, unsplash+"$1?w=1600&q=80&auto=format")
}

// loadDrafts parses content/*.md: a `key: value` header between `---` lines, the markdown body, then an optional
// `<!--comments-->` block of `username: text` lines.
func loadDrafts() []draft {
	entries, err := contentFS.ReadDir("content")
	if err != nil {
		log.Fatal(err)
	}
	var out []draft
	for _, e := range entries {
		raw, _ := contentFS.ReadFile("content/" + e.Name())
		parts := strings.SplitN(string(raw), "\n---\n", 2)
		if len(parts) != 2 || !strings.HasPrefix(parts[0], "---\n") {
			log.Fatalf("%s: missing front matter", e.Name())
		}
		d := draft{File: e.Name(), Status: "published", Difficulty: "beginner"}
		for _, line := range strings.Split(strings.TrimPrefix(parts[0], "---\n"), "\n") {
			k, v, ok := strings.Cut(line, ":")
			if !ok {
				continue
			}
			v = strings.TrimSpace(v)
			switch strings.TrimSpace(k) {
			case "title":
				d.Title = v
			case "author":
				d.Author = v
			case "category":
				d.Category = v
			case "difficulty":
				d.Difficulty = v
			case "status":
				d.Status = v
			case "age":
				d.Age, _ = strconv.Atoi(v)
			case "featured":
				d.Featured = v == "true"
			case "cover":
				d.Cover = expandImages(v)
			}
		}
		body, comments, _ := strings.Cut(parts[1], "<!--comments-->")
		d.Body = strings.TrimSpace(expandImages(body))
		for _, line := range strings.Split(comments, "\n") {
			if a, t, ok := strings.Cut(line, ": "); ok && strings.TrimSpace(a) != "" {
				d.Comments = append(d.Comments, draftComment{strings.TrimSpace(a), strings.TrimSpace(t)})
			}
		}
		if d.Title == "" || d.Author == "" || d.Category == "" || d.Cover == "" {
			log.Fatalf("%s: title, author, category and cover are required", e.Name())
		}
		out = append(out, d)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].File < out[j].File })
	return out
}

var (
	mdImage  = regexp.MustCompile(`!\[[^\]]*\]\((https://[^)\s]+)\)`)
	mdStrip  = regexp.MustCompile("[`*_#>\\[\\]]|\\(https?://[^)]*\\)")
	spaceRun = regexp.MustCompile(`\s+`)
)

// excerpt: first prose paragraph without markdown, cut to ~220 chars on a word boundary.
func excerpt(body string) string {
	for _, para := range strings.Split(body, "\n\n") {
		p := strings.TrimSpace(para)
		if p == "" || strings.HasPrefix(p, "#") || strings.HasPrefix(p, "!") || strings.HasPrefix(p, "```") || strings.HasPrefix(p, "|") || strings.HasPrefix(p, "-") {
			continue
		}
		p = spaceRun.ReplaceAllString(mdStrip.ReplaceAllString(p, ""), " ")
		if len(p) <= 220 {
			return p
		}
		cut := strings.LastIndex(p[:220], " ")
		return p[:cut] + "…"
	}
	return ""
}

func wordCount(s string) int { return len(strings.Fields(s)) }

// checkImages GETs every distinct image URL (HEAD is unreliable on Unsplash) and aborts listing the broken ones.
func checkImages(drafts []draft) {
	urls := map[string]bool{}
	for _, d := range drafts {
		urls[d.Cover] = true
		for _, m := range mdImage.FindAllStringSubmatch(d.Body, -1) {
			urls[m[1]] = true
		}
	}
	for _, p := range people {
		if p.Avatar != "" {
			urls[p.Avatar] = true
		}
	}
	client := &http.Client{Timeout: 40 * time.Second}
	var bad []string
	for u := range urls {
		resp, err := client.Get(u)
		if err != nil {
			bad = append(bad, fmt.Sprintf("%s (%v)", u, err))
			continue
		}
		n, _ := io.Copy(io.Discard, io.LimitReader(resp.Body, 64<<10))
		resp.Body.Close()
		if resp.StatusCode != 200 || n < 500 {
			bad = append(bad, fmt.Sprintf("%s (status %d, %d bytes)", u, resp.StatusCode, n))
		}
	}
	if len(bad) > 0 {
		sort.Strings(bad)
		log.Fatalf("broken image URLs:\n%s", strings.Join(bad, "\n"))
	}
	log.Printf("%d image URLs OK", len(urls))
}
