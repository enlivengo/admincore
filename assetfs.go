package admin

import (
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

var (
	root, _ = os.Getwd()
)

func init() {
	if path := os.Getenv("WEB_ROOT"); path != "" {
		root = path
	}
}

type AssetFSInterface interface {
	RegisterPath(path string) error
	Asset(name string) ([]byte, error)
	Glob(pattern string) (matches []string, err error)
	Compile() error
}

type fileSystem struct {
	Paths []string
}

func (fs *fileSystem) RegisterPath(pth string) error {
	if _, err := os.Stat(pth); !os.IsNotExist(err) {
		var existing bool
		for _, p := range fs.Paths {
			if p == pth {
				existing = true
				break
			}
		}
		if !existing {
			fs.Paths = append(fs.Paths, pth)
		}
		return nil
	}
	return errors.New("not found")
}

func (fs *fileSystem) Asset(name string) ([]byte, error) {
	for _, pth := range fs.Paths {
		if _, err := os.Stat(filepath.Join(pth, name)); err == nil {
			return ioutil.ReadFile(filepath.Join(pth, name))
		}
	}
	return []byte{}, fmt.Errorf("%v not found", name)
}

func (fs *fileSystem) Glob(pattern string) (matches []string, err error) {
	for _, pth := range fs.Paths {
		if results, err := filepath.Glob(filepath.Join(pth, pattern)); err == nil {
			for _, result := range results {
				matches = append(matches, strings.TrimPrefix(result, pth))
			}
		}
	}
	return
}

func (fs *fileSystem) Compile() error {
	return nil
}
