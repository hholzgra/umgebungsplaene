# requirements:
# apt install asciidoctor
# gem install --pre asciidoctor-pdf

.PHONY: clean all
.SUFFIXES: .txt .html .pdf

all: map-doc.html map-doc.pdf map-doc-en.html map-doc-en.pdf

clean: 
	rm -f *.html *.pdf

map-doc.html: map-doc.txt
	asciidoctor $<

map-doc.pdf: map-doc.txt
	asciidoctor-pdf $<

.txt.html: 
	asciidoctor $<

.txt.pdf: 
	asciidoctor-pdf $<

