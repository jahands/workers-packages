---
'workers-tagged-logger': minor
---

fix: Export WithLogTags decorator and simplify signature

Forgot to export WithLogTags in 0.6.0 so this fixes that.

Also simplified WithLogTags signature to take either a source string, or an object containing tags.