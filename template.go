package admin

var viewPaths []string

func RegisterViewPath(pth string) {
	viewPaths = append(viewPaths, pth)
}
