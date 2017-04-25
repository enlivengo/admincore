package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/qor/admin/tests/dummy"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	fmt.Printf("Listening on: %s\n", port)
	http.ListenAndServe(fmt.Sprintf(":%s", port), dummy.NewDummyAdmin().NewServeMux("/admin"))
}
