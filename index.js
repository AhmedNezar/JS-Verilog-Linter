const file = document.querySelector("#file");
let lines = [];
let registers = [];
let errors = [];

file.addEventListener("change", function (event) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function () {
        var text = reader.result;
        splitLines(text);
        loadRegisters();
        checkUnreachableState();
        checkNonFull();
        checkParallel();
        checkMultiDriven();
        showOutput();
    };
    reader.readAsText(input.files[0]);
});

function splitLines(text) {
    lines = text.split("\n");
}

function loadRegisters() {
    let skip = false;
    let nested = 0;
    let nextBegin;
    for (let i = 0; i < lines.length; i++) {
        if (skip) {
            if (lines[i].match(/end\b/)) nested--;
            else if (lines[i].match(/begin\b/) && i != nextBegin) nested++;
            if (nested == 0) skip = false;
            continue;
        }
        if (lines[i].match(/initial\b/) || lines[i].match(/always\b/)) {
            if (lines[i].match(/begin\b/) || lines[nextNonEmptyLine(i + 1)].match(/begin\b/)) {
                nested++;
                if (lines[nextNonEmptyLine(i + 1)].match(/begin\b/)) nextBegin = nextNonEmptyLine(i + 1);
                skip = true;
            }
            else i++;
            continue;
        }
        if (lines[i].match(/reg+[\[ | ]/)) {
            const oneBit = lines[i].match(/reg(?!( *\[))/);
            let length = (oneBit) ? 1 : Math.abs(lines[i].split("[")[1].split(":")[0] - lines[i].split("[")[1].split(":")[1].split("]")[0]) + 1;
            let name = (lines[i].includes("=")) ? lines[i].split("=")[0].split((oneBit) ? " " : "]")[1].trim() : lines[i].split((oneBit) ? " " : "]")[1].trim();
            let value = (lines[i].includes("=")) ? lines[i].split("=")[1].trim() : "x";
            if (value != "x") value = (value.match(/^[0-9]'[a-zA-z][0-9a-fA-F]+$/)) ? convertToBinary(value) : '';
            let line = i + 1;
            const reg = { name, length, value, line };
            registers.push(reg);
            checkOverflow(reg);
        }
    };
    checkUnintialized();
    checkOverflow();
    console.log(registers);
}

function checkUnintialized() {
    for (let i = 0; i < registers.length; i++) {
        if (registers[i].value == "x") errors.push(`Register ${registers[i].name} on line ${registers[i].line} is uninitialized`);
    }
}

function checkOverflow(reg) {
    if (reg) {
        if (reg.value != "x" && reg.value.length > reg.length) {
            reg.value = reg.value.substring(reg.value.length - reg.length);
            errors.push(`Register ${reg.name} arthemtic overflow on line ${reg.line}`);
        }
    }
    else {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("+")) {
                const newReg = lines[i].match(/reg\b/);
                const oneBit = lines[i].match(/reg(?!( *\[))/);
                let target = lines[i].split("=")[0].trim();
                if (newReg) target = (oneBit) ? target.split(" ")[1].trim() : target.split("]")[1].trim();
                let left = lines[i].split("=")[1].split("+")[0].trim();
                let right = lines[i].split("=")[1].split("+")[1].trim();
                left = (left.match(/[0-9]'[a-zA-z][0-9a-fA-F]+/)) ? convertToBinary(left) : registers.find(reg => reg.name == left).value;
                right = (right.match(/[0-9]'[a-zA-z][0-9a-fA-F]+/)) ? convertToBinary(right) : registers.find(reg => reg.name == right).value;
                const sum = (left == 'x' || right == 'x') ? 'x' : parseInt(left, 2) + parseInt(right, 2);
                registers.find(reg => reg.name == target).value = (sum == 'x') ? 'x' : sum.toString(2).substring(sum.toString(2).length - registers.find(reg => reg.name == target).length);
                if (sum != 'x' && sum > Math.pow(2, registers.find(reg => reg.name == target).length) - 1) errors.push(`Register ${target} arthemtic overflow on line ${i + 1}`);
            }
        }
    }
}

function checkUnreachableState() {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/(case[x|z]?\b)+[\( | ]/)) {
            let switchReg = lines[i].split("(")[1].split(")")[0].trim();
            switchReg = registers.find(reg => reg.name == switchReg);
            const endcase = findEndcase(i);
            for (let x = i + 1; x < endcase; x++) {
                if (lines[x].match(/default/)) continue;
                if (!lines[x].match(/[0-9a-zA-z]:/)) continue;
                const caseReg = lines[x].split(":")[0].trim();
                const value = (caseReg.match(/[0-9]'[a-zA-z][0-9a-fA-FxXzZ\?]+/)) ? convertToBinary(caseReg) : registers.find(reg => reg.name == caseReg).value;
                if (value.length > switchReg.length) errors.push("Unreachable state on line " + (x + 1));
            }
            i = endcase;
        }
    }
}

function checkNonFull() {
    let caseLine;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/(case[x|z]?\b)+[\( | ]/)) {
            caseLine = i;
            let switchReg = lines[i].split("(")[1].split(")")[0].trim();
            switchReg = registers.find(reg => reg.name == switchReg);
            const endcase = findEndcase(i);
            const size = Math.pow(2, switchReg.length);
            let cases = [];
            for (let x = 0; x < size; x++) cases.push(parseInt(x.toString(2)));
            for (let x = i + 1; x < endcase; x++) {
                if (lines[x].match(/default/)) {
                    cases = [];
                    break;
                }
                if (!lines[x].match(/[0-9a-zA-z]:/)) continue;
                const caseReg = lines[x].split(":")[0].trim(); 
                const value = (caseReg.match(/[0-9]'[a-zA-z][0-9a-fA-FxXzZ\?]+/)) ? convertToBinary(caseReg, (convertToBinary(caseReg) == "")) : registers.find(reg => reg.name == caseReg).value;
                if (cases.includes(parseInt(value))) cases.splice(cases.indexOf(parseInt(value)), 1);
            }
            if (cases.length > 0 && synopsys(caseLine, "full_case")) errors.push("Synthesis will not infer a latch");
            else if (cases.length > 0) errors.push("Non full case on line " + (i + 1) + " cases: " + cases.join(", "));
            i = endcase;
        }
    }
}

function checkParallel() {
    let caseLine;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/(case[x|z]?\b)+[\( | ]/)) {
            const caseType = lines[i].split("case")[1][0];
            caseLine = i;
            let switchReg = lines[i].split("(")[1].split(")")[0].trim();
            switchReg = registers.find(reg => reg.name == switchReg);
            const endcase = findEndcase(i);
            const cases = [];
            for (let x = i + 1; x < endcase; x++) {
                if (lines[x].match(/default/)) continue;
                if (!lines[x].match(/[0-9a-zA-za-fA-F\?+]:/)) continue;
                let caseReg = lines[x].split(":")[0].trim();
                caseReg = (caseType != "x" && caseType != "z") ? caseReg : caseReg.replace(/z/g, "?");
                caseReg = (caseType == "x") ? caseReg.replace(/x/g, "?") : caseReg;
                const value = (caseReg.match(/[0-9]'[a-zA-z][0-9a-fA-FxX\?]+/)) ? convertToBinary(caseReg, true) : registers.find(reg => reg.name == caseReg).value;
                cases.push(value);
            }
            for (let x = 0; x < cases.length; x++) {
                for (let y = cases[x].length - 1; y >= 0; y--) {
                    if (cases[x][y] != '?') continue;
                    for (let j = 0; j < cases.length; j++) {
                        cases[j] = cases[j].substring(0, y) + cases[j].substring(y + 1);
                    }
                }
            }
            let parallel = true;
            for (let x = 0; x < cases.length; x++) {
                for (let y = x + 1; y < cases.length; y++) {
                    if (cases[x] == cases[y]) {
                        parallel = false;
                        break;
                    }
                }
            }
            if(!parallel && synopsys(caseLine, "parallel_case")) errors.push("Non prioirty logic will be synthesized");
            else if (!parallel) errors.push("Not parallel case on line " + (i + 1));
            i = endcase;
        }
    }
}

function checkMultiDriven() {
    const definedRegisters = [];
    let blockNo = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/always/)) {
            blockNo++;
            continue;
        }
        if (lines[i].match(/=/)) {
            const reg = lines[i].split("=")[0].trim();
            const exist = definedRegisters.find(r => r.name == reg);
            if (exist && exist.block != blockNo) errors.push("Multi driven register on line " + (i + 1) + " register: " + reg);
            else definedRegisters.push({ name: reg, block: blockNo });
        }
    }
}

function synopsys(line, c) {
    if (lines[line].match(/\/\/ *synopsys/)) {
        const comment = lines[line].split("synopsys")[1].trim();
        if (comment.includes(c)) return true;
    }
    return false;
}

// synopsys parallel_case
// synopsys full_case
// synopsys full_case parallel_case
// synthesis parallel_case
// synthesis full_case
// synthesis full_case parallel_case
// pragma parallel_case
// pragma full_case
// pragma full_case parallel_case

function nextNonEmptyLine(line) {
    let i = line;
    while (lines[i] == "") i++;
    return (i >= lines.length) ? lines.length - 1 : i;
}

function findEndcase(line) {
    let i = line;
    while (!lines[i].match(/endcase\b/)) i++;
    return i;
}

function convertToBinary(value, zeroes = false) {
    const bases = { h: 16, o: 8, d: 10, b: 2 };
    const base = value.split("'")[1][0];
    const v = value.split("'")[1].substring(1);
    let converted = "";
    for (let i = 0; i < v.length; i++) {
        if (v[i] == "?" || v[i] == "x" || v[i] == "X" || v[i] == "z" || v[i] == "Z") {
            for (let j = 0; j < Math.log2(bases[base]); j++) converted += v[i];
        }
        else {
            const bin = parseInt(v[i], bases[base]).toString(2);
            let zeros = "";
            for (let j = bin.length; j < Math.log2(bases[base]); j++) {
                zeros += "0";
            }
            converted += zeros + bin;
        }
    }
    converted = converted.replace(/^0{1,}/, "");
    if (zeroes) converted = addZeroes(converted, value.split("'")[0]);
    return converted;
    // const hex2bin = parseInt(v, 16).toString(2);
    // const oct2bin = parseInt(v, 8).toString(2);
    // const dec2bin = parseInt(v, 10).toString(2);
    // if (base == "b") return v;
    // else if (base == "h") return hex2bin;
    // else if (base == "o") return oct2bin;
    // else if (base == "d") return dec2bin;
}

function addZeroes(value, length) {
    while (value.length < length) value = "0" + value;
    return value;
}

function showOutput() {
    const output = document.getElementById("output");
    while (output.firstChild) output.removeChild(output.firstChild);
    for (let i = 0; i < errors.length; i++) {
        const p = document.createElement("p");
        p.innerText = errors[i];
        p.classList.add("output-line");
        output.appendChild(p);
    }
    generatePDF();
    errors = [];
    lines = [];
    registers = [];
}

function generatePDF() {
    const doc = new jsPDF();
    doc.text(20, 10, "Number of errors: " + errors.length);
    doc.text(20, 20, "Errors:");
    for(let i = 0; i < errors.length; i++) {
        doc.text(20, 30 + i * 10, errors[i]);
    }
    doc.save("report.pdf");
}