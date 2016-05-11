package admin

import (
	"os"
	"path/filepath"
)

var AssetFS AssetFSInterface

type AssetFSInterface interface {
	RegisterPath(path string)
	Asset(name string) ([]byte, error)
	Compile() error
}

func init() {
	var files []string

	for _, viewPath := range viewPaths {
		filepath.Walk(viewPath, func(path string, info os.FileInfo, err error) error {
		})
	}
}
