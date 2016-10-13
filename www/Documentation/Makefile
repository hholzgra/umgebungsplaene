# requirements:
# apt install asciidoctor
# gem install --pre asciidoctor-pdf

.PHONY: clean all

all: map-doc.html map-doc.pdf

clean: 
	rm -f *.html *.pdf

map-doc.html: map-doc.txt
	asciidoctor $<

map-doc.pdf: map-doc.txt
	asciidoctor-pdf $<
