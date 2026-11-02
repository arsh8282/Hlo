[app]
title = JARVIS AI
package.name = jarvisai
package.domain = org.jarvis
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,json,sql
version = 1.0.0

requirements = python3,kivy==2.3.0,requests,urllib3,certifi,charset-normalizer,idna,pyjnius,android

orientation = portrait
fullscreen = 0
android.archs = arm64-v8a, armeabi-v7a
android.api = 34
android.minapi = 26
android.ndk = 25b
android.accept_sdk_license = True
android.permissions = INTERNET, RECORD_AUDIO, POST_NOTIFICATIONS, SYSTEM_ALERT_WINDOW, FOREGROUND_SERVICE
android.allow_backup = True

[buildozer]
log_level = 2
warn_on_root = 1
