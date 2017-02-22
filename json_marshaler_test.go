package admin_test

import (
	"bytes"
	"errors"
	"testing"

	"github.com/qor/admin"
)

func TestMarshalMapToJSON(t *testing.T) {
	var buffer bytes.Buffer

	jsonEncoding := &admin.JSONEncoding{}
	encoder := admin.Encoder{
		Result: map[string]interface{}{"error": []error{errors.New("error1"), errors.New("error2")}},
	}
	jsonEncoding.Encode(&buffer, encoder)

	except := "{\n\t\"error\": [\n\t\t\"error1\",\n\t\t\"error2\"\n\t]\n}"
	if except != buffer.String() {
		t.Errorf("Failed to decode errors map to JSON, except: %v, but got %v", except, buffer.String())
	}
}
