package admin_test

import (
	"encoding/xml"
	"fmt"
	"testing"

	"github.com/qor/admin"
)

func TestMarshalXML(t *testing.T) {
	xmlResult := admin.XMLResult{
		Result: map[string]string{"hello": "Hello"},
	}

	if xmlMarshalResult, err := xml.MarshalIndent(xmlResult, "", "\t"); err != nil {
		t.Errorf("no error should happen, but got %v", err)
	} else {
		fmt.Println(string(xmlMarshalResult))
	}

	xmlResult = admin.XMLResult{
		Result: User{Name: "jinzhu", Age: 18},
	}

	if xmlMarshalResult, err := xml.MarshalIndent(xmlResult, "", "\t"); err != nil {
		t.Errorf("no error should happen, but got %v", err)
	} else {
		fmt.Println(string(xmlMarshalResult))
	}
}
