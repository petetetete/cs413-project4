<?php

// $data[] = $_POST["data"];

// Get simple json file and add to the end of the string
$name = "jack";
$score = 500;

$str = file_get_contents("test.json");
$newstr = rtrim($str, "\n}").",\n\t\"".$name."\": ".$score."\n}";
file_put_contents("test.json", $newstr);
?>