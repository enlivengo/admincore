package admin

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"html/template"
)

var (
	layouts    = map[string]*template.Template{}
	templates  = map[string]*template.Template{}
	tmplSuffix = regexp.MustCompile(`(\.tmpl)?$`)
	root, _    = os.Getwd()
)

func init() {
	if path := os.Getenv("WEB_ROOT"); path != "" {
		root = path
	}

	AssetFS.RegisterPath(filepath.Join(root, "app/views/qor"))
	RegisterViewPath("github.com/qor/admin/views")
}

// RegisterViewPath register views directory
func RegisterViewPath(p string) {
	if AssetFS.RegisterPath(filepath.Join(root, "vendor", p)) != nil {
		for _, gopath := range strings.Split(os.Getenv("GOPATH"), ":") {
			AssetFS.RegisterPath(filepath.Join(gopath, "src", p))
		}
	}
}

func isExistingDir(pth string) bool {
	fi, err := os.Stat(pth)
	if err != nil {
		return false
	}
	return fi.Mode().IsDir()
}
