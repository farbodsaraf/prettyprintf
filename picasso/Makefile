clean:
	- rm images/full/*.png
	- rm images/thumbnails/*.png

clean-s3:
	aws s3 rm --recursive s3://pretty-printf-thumbnails --profile prettyprintf

prints:
	GENERATE_PRINTS=1 PP_CONCURRENCY=10 node index.js
	tput bel
	say "Done generating the prints."

thumbnails:
	gm mogrify -create-directories -output-directory images/thumbnails/ -thumbnail 30%  images/full/*.png
	mv images/thumbnails/images/full/*.png images/thumbnails
	rm -r images/thumbnails/images
	cd ..
	tput bel
	say "Done compressing the prints."

upload-thumbs:
	aws s3 cp --recursive images/thumbnails s3://pretty-printf-thumbnails --acl public-read --profile prettyprintf
	tput bel
	say "Done uploading images."

csv:
	node utils/generate_csv.js

hash-fulls:
	node utils/hash_fulls.js

upload-fulls:
	aws s3 cp --recursive images/full s3://pretty-printf-thumbnails --acl public-read --profile prettyprintf
	tput bel
	say "Done uploading fulls."

all: clean clean-s3 prints thumbnails upload-thumbs csv hash-fulls upload-fulls