package bindata

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/qor/admin"
)

type Bindata struct {
	AssetFileSystem admin.AssetFSInterface
	ViewPaths       []string
}

func New() *Bindata {
	return &Bindata{AssetFileSystem: &admin.AssetFileSystem{}}
}

func (bindata *Bindata) RegisterPath(path string) error {
	bindata.ViewPaths = append(bindata.ViewPaths, path)
	return bindata.AssetFileSystem.RegisterPath(path)
}

func (bindata *Bindata) CopyFiles(templatesPath string) {
	for i := len(bindata.ViewPaths) - 1; i >= 0; i-- {
		viewPath := bindata.ViewPaths[i]
		filepath.Walk(viewPath, func(path string, info os.FileInfo, err error) error {
			if err == nil {
				var relativePath = strings.TrimPrefix(path, viewPath)

				if info.IsDir() {
					err = os.MkdirAll(filepath.Join(templatesPath, relativePath), os.ModePerm)
				} else if info.Mode().IsRegular() {
					if source, err := ioutil.ReadFile(path); err == nil {
						err = ioutil.WriteFile(filepath.Join(templatesPath, relativePath), source, os.ModePerm)
					}
				}
			}
			return err
		})
	}
}
