package admin

import (
	"encoding/json"
	"mime"
	"path"
)

type JSONEncoding struct{}

func (JSONEncoding) CouldEncode(encoder Encoder) bool {
	if encoder.Context != nil && encoder.Context.Request != nil {
		if path.Ext(encoder.Context.Request.RequestURI) == ".json" {
			return true
		}

		if types, err := mime.ExtensionsByType(encoder.Context.Request.Header.Get("accept")); err == nil {
			for _, typ := range types {
				if typ == ".json" {
					return true
				}
			}
		}
	}

	return false
}

func (JSONEncoding) Encode(dst interface{}, encoder Encoder) error {
	context := encoder.Context

	js, err := json.MarshalIndent(context.Resource.convertObjectToJSONMap(context, encoder.Result, encoder.Action), "", "\t")
	if err != nil {
		result := make(map[string]string)
		result["error"] = err.Error()
		js, _ = json.Marshal(result)
	}

	_, err = context.Writer.Write(js)
	return err
}
