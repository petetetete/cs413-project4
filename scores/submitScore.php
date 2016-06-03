<?php

$name = $_POST["name"];
$score = $_POST["score"];

if (!(empty($name) && empty($score))) {
	$str = file_get_contents("scores.json");
	$begin = ($str === "" ? "[" : ", ");
	$newstr = rtrim($str, "]") . $begin . "{\n\t\"name\": \"" . $name . "\",\n\t\"score\": " . $score . "\n}]";
	echo $newstr;
	file_put_contents("scores.json", $newstr);
}
?>