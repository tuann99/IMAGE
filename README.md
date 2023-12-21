# IMAGE

The Interface for Metagenomic Analysis and Graphical Examination.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Acknowledgments](#acknowledgments)

## Introduction

This app aims to streamline metagenomic analyses by bundling an intuitive GUI with essential analytical tools.

- `/db` contains a TSV file that the app will parse for Enzyme Commission numbers.
- `/example_data` contains a few sample fasta files that range from one sequence (`example_shortest.fsa`) to 14 sequences (`example_longest.fsa`).
- `/image-env` contains the venv I created for the app in addition to a full Python 3.12 interpreter.
- `/tmp` is the directory that temporary files are written to

## Features

BLASTX will be ran on metagenomic samples to generate functional abundance pie graphs.

## Prerequisites

## Installation

1. Download the executable from [Dropbox](https://www.dropbox.com/scl/fi/datgjvj7kzn1kcdjfb9c9/IMAGE-win32-x64-0.0.5.zip?rlkey=hap1ls0g0p07yfw9rav1jny97&dl=0)
1. Extract the contents

## Usage

1. Open the `IMAGE.exe` executable.
1. Upload a file, or copy and paste in sequences from your FASTA file.

## Technologies Used

- Electron.js
- CSS
- HTML
- JavaScript
  - JavaScript Libraries: Chart.js
- Python
  - Python Libraries:

## Acknowledgments