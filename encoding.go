package admin

import (
	"errors"
	"io"
)

var (
	ErrUnsupportedEncoder = errors.New("unsupported encoder")
	ErrUnsupportedDecoder = errors.New("unsupported decoder")
)

var DefaultEncoding = &Encoding{}

func init() {
	DefaultEncoding.RegisterEncoding(&XMLEncoding{}, &JSONEncoding{})
}

type Encoding struct {
	Encoders []EncoderInterface
	Decoders []DecoderInterface
}

type EncodingInterface interface {
	EncoderInterface
	DecoderInterface
}

func (encoding *Encoding) RegisterEncoding(encodings ...interface{}) error {
	for _, e := range encodings {
		valid := false

		if encoder, ok := e.(EncoderInterface); ok {
			valid = true
			encoding.Encoders = append(encoding.Encoders, encoder)
		}

		if decoder, ok := e.(DecoderInterface); ok {
			valid = true
			encoding.Decoders = append(encoding.Decoders, decoder)
		}

		if !valid {
			return errors.New("invalid encoder/decoder")
		}
	}

	return nil
}

func (encoding *Encoding) RegisterDecoder(encoder DecoderInterface) {
	encoding.Decoders = append(encoding.Decoders, encoder)
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
	for _, f := range encoding.Encoders {
		if f.CouldEncode(encoder) {
			if err := f.Encode(writer, encoder); err != ErrUnsupportedEncoder {
				return err
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
	for _, d := range encoding.Decoders {
		if d.CouldDecode(decoder) {
			if err := d.Decode(writer, decoder); err != ErrUnsupportedDecoder {
				return err
			}
		}
	}

	return ErrUnsupportedDecoder
}
