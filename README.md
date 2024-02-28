# JS-Verilog-Linter-
JavaScript-based Verilog Linter designed to analyze Verilog code
Verilog Linter in JavaScript

# Overview
This repository contains a JavaScript-based Verilog Linter designed to analyze Verilog code, identify potential issues, and enhance code quality. The linter checks for various aspects such as syntax errors, uninitialized registers, arithmetic overflows, unreachable states, non-full case statements, non-parallel case statements, and multi-driven registers.

# Features
# Syntax Checking:

Detects and highlights syntax errors in Verilog code.
# Uninitialized Register Check:

Identifies and reports uninitialized registers in the code.
# Arithmetic Overflow Check:

Ensures that arithmetic operations on registers do not result in overflow.
# Unreachable State Detection:

Flags unreachable states within case statements based on register value lengths.
# Non-Full Case Check:

Identifies case statements that are not fully specified and may result in latch inference.
# Parallel Case Check:

Flags non-parallel case statements that may lead to non-priority logic synthesis.
# Multi-Driven Register Detection:

Checks for registers being driven by multiple blocks within an always construct.
# PDF Report Generation:

Generates a PDF report summarizing the linting results and errors.
Usage
# Upload Verilog File:

Select a Verilog file using the file input.
# Linting Process:

The linter will perform various checks on the provided Verilog code.
# Output Display:

# Detected errors will be displayed in the web interface.

# PDF Report:
A PDF report summarizing linting results can be generated and downloaded.
