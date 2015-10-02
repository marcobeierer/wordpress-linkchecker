<?php
namespace MarcoBeierer;

class Template {

	private $filepath;
	private $variables;

	function __construct($filepath) {
		$this->filepath = $filepath;
	}

	function setVar($name, $value) {
		$this->variables[$name] = $value;
	}

	function getHTML() {

		$html = file_get_contents($this->filepath);

		foreach ($this->variables as $name => $value) {
			$html = str_replace("[[$name]]", $value, $html);
		}

		return $html;
	}

	function render() {
		echo $this->getHTML();
	}
}
?>
