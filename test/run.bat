@echo off
pushd %~dp0\..
del test\generated-spec.js
copy /b util.js+cards.js+player.js+store.js+test\cardtests.js test\generated-spec.js || goto :error
call jasmine-node test
del test\generated-spec.js
goto :finish

:error
echo Failed with error #%errorlevel%.
exit /b %errorlevel%

:finish
popd
