tell application "System Events"
	set proc to first process whose bundle identifier is "com.microsoft.VSCode"
	tell proc
		set win to first window
		set winPos to position of win
		set winSize to size of win
		return name of win & "~" & (item 1 of winPos as string) & "~" & (item 2 of winPos as string) & "~" & (item 1 of winSize as string) & "~" & (item 2 of winSize as string)
	end tell
end tell