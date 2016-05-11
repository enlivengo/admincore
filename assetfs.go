package admin

var AssetFS AssetFSInterface

type AssetFSInterface interface {
	RegisterPath(path string) error
	Asset(name string) ([]byte, error)
	Compile() error
}
