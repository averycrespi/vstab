on run argv
	set tabBarHeight to item 1 of argv as integer
	
	tell application "System Events"
		set proc to first process whose bundle identifier is "com.microsoft.VSCode"
		tell proc
			set win to first window
			set winPos to position of win
			set winSize to size of win
			
			-- Move window down by tab bar height if at top
			if item 2 of winPos < tabBarHeight then
				set position of win to {item 1 of winPos, tabBarHeight}
				set size of win to {item 1 of winSize, (item 2 of winSize) - tabBarHeight}
			end if
		end tell
	end tell
end run