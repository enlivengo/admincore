package admin

import (
	"errors"
	"io"
	"mime"
	"net/http"
	"path"
	"strings"
)

var (
	// ErrUnsupportedEncoder unsupported encoder error
	ErrUnsupportedEncoder = errors.New("unsupported encoder")
	// ErrUnsupportedDecoder unsupported decoder error
	ErrUnsupportedDecoder = errors.New("unsupported decoder")
)

// DefaultEncoding  admin default encoding
var DefaultEncoding = &Encoding{
	Encoders: map[string][]EncoderInterface{},
	Decoders: map[string][]DecoderInterface{},
}

func init() {
	DefaultEncoding.RegisterEncoding("xml", &XMLEncoding{})
	DefaultEncoding.RegisterEncoding("json", &JSONEncoding{})
}

// Encoding encoder & decoder
type Encoding struct {
	Encoders map[string][]EncoderInterface
	Decoders map[string][]DecoderInterface
}

func (encoding *Encoding) RegisterEncoding(format string, encodings ...interface{}) error {
	format = "." + strings.TrimPrefix(format, ".")

	for _, e := range encodings {
		valid := false

		if encoder, ok := e.(EncoderInterface); ok {
			valid = true
			encoding.Encoders[format] = append(encoding.Encoders[format], encoder)
		}

		if decoder, ok := e.(DecoderInterface); ok {
			valid = true
			encoding.Decoders[format] = append(encoding.Decoders[format], decoder)
		}

		if !valid {
			return errors.New("invalid encoder/decoder")
		}
	}

	return nil
}

type EncoderInterface interface {
	CouldEncode(Encoder) bool
	Encode(writer io.Writer, encoder Encoder) error
}

type Encoder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

func (encoding *Encoding) Encode(writer io.Writer, encoder Encoder) error {
	for _, format := range getFormats(encoder.Context.Request) {
		if encoders, ok := encoding.Encoders[format]; ok {
			for _, e := range encoders {
				if e.CouldEncode(encoder) {
					if err := e.Encode(writer, encoder); err != ErrUnsupportedEncoder {
						return err
					}
				}
			}
		}
	}

	return ErrUnsupportedEncoder
}

type DecoderInterface interface {
	CouldDecode(Decoder) bool
	Decode(writer io.Writer, decoder Decoder) error
}

type Decoder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

func (encoding *Encoding) Decode(writer io.Writer, decoder Decoder) error {
	for _, format := range getFormats(decoder.Context.Request) {
		if decoders, ok := encoding.Decoders[format]; ok {
			for _, d := range decoders {
				if d.CouldDecode(decoder) {
					if err := d.Decode(writer, decoder); err != ErrUnsupportedDecoder {
						return err
					}
				}
			}
		}
	}

	return ErrUnsupportedDecoder
}

func getFormats(request *http.Request) (formats []string) {
	if format := path.Ext(request.URL.Path); format != "" {
		formats = append(formats, format)
	}

	if extensions, err := mime.ExtensionsByType(request.Header.Get("Accept")); err == nil {
		formats = append(formats, extensions...)
	} else {
		for _, accept := range strings.FieldsFunc(request.Header.Get("Accept"), func(s rune) bool { return string(s) == "," || string(s) == ";" }) {
			if extensions, err := mime.ExtensionsByType(accept); err == nil {
				formats = append(formats, extensions...)
			}
		}
	}

	return
}
