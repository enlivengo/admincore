package admin

import (
	"errors"
	"io/ioutil"
	"os"
	"path/filepath"
)

var AssetFS AssetFSInterface

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
		fs.Paths = append(fs.Paths, pth)
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
	return []byte{}, nil
}

func (fs *fileSystem) Glob(pattern string) (matches []string, err error) {
	for _, pth := range fs.Paths {
		if results, err := filepath.Glob(filepath.Join(pth, pattern)); err == nil {
			matches = append(matches, results...)
		}
	}
	return
}

func (fs *fileSystem) Compile() error {
	return nil
}

func init() {
	AssetFS = &fileSystem{}
}
