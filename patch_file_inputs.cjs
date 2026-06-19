const fs = require('fs');

function patchCardInput() {
  let content = fs.readFileSync('src/components/CardInput.tsx', 'utf8');
  if (!content.includes('import mammoth from')) {
    content = "import mammoth from 'mammoth';\n" + content;
  }
  content = content.replace(/accept="image\/\*,application\/json,\.json"/g, 'accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"');

  const insertText = `
    } else if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".rtf") || file.type === "text/plain" || file.type === "text/markdown") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDescription(text);
        setImageBase64(null);
        setImagePreview(null);
        setImageMimeType(null);
        setExtractedName(null);
        setShowExtractedBanner(false);
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setDescription(result.value);
          setImageBase64(null);
          setImagePreview(null);
          setImageMimeType(null);
          setExtractedName(null);
          setShowExtractedBanner(false);
        } catch (error) {
          alert("Failed to read document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {`;
  
  if (!content.includes('mammoth.extractRawText')) {
    const parts = content.split('reader.readAsText(file);');
    if (parts.length > 1) {
      const splitAfter = parts[1].split('} else {');
      parts[1] = splitAfter[0] + insertText + splitAfter.slice(1).join('} else {');
      content = parts.join('reader.readAsText(file);');
    }
  }

  content = content.replace(/PNG\/JSON\/TXT\/DOCX\/TXT\/DOCX/g, 'PNG/JSON/TXT/DOCX');

  fs.writeFileSync('src/components/CardInput.tsx', content);
}

function patchComparisonInput() {
  let content = fs.readFileSync('src/components/ComparisonInput.tsx', 'utf8');
  if (!content.includes('import mammoth from')) {
    content = "import mammoth from 'mammoth';\n" + content;
  }
  content = content.replace(/accept="image\/\*,application\/json,\.json"/g, 'accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"');

  const insertText = `
    } else if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".rtf") || file.type === "text/plain" || file.type === "text/markdown") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDesc(text);
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setDesc(result.value);
        } catch (error) {
          alert("Failed to read document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {`;
  
  if (!content.includes('mammoth.extractRawText')) {
    const parts = content.split('reader.readAsText(file);');
    if (parts.length > 1) {
      const splitAfter = parts[1].split('} else {');
      parts[1] = splitAfter[0] + insertText + splitAfter.slice(1).join('} else {');
      content = parts.join('reader.readAsText(file);');
    }
  }

  content = content.replace(/PNG\/JSON\/TXT\/DOCX\/TXT\/DOCX/g, 'PNG/JSON/TXT/DOCX');

  fs.writeFileSync('src/components/ComparisonInput.tsx', content);
}

function patchGroupInput() {
  let content = fs.readFileSync('src/components/GroupInput.tsx', 'utf8');
  if (!content.includes('import mammoth from')) {
    content = "import mammoth from 'mammoth';\n" + content;
  }
  content = content.replace(/accept="image\/\*,application\/json,\.json"/g, 'accept="image/*,application/json,.json,.txt,.md,.rtf,.docx,.doc"');

  const insertText = `
    } else if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".rtf") || file.type === "text/plain" || file.type === "text/markdown") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setMembers((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, description: text } : m
          )
        );
      };
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setMembers((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, description: result.value } : m
            )
          );
        } catch (error) {
          alert("Failed to read document.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {`;
  
  if (!content.includes('mammoth.extractRawText')) {
    const parts = content.split('reader.readAsText(file);');
    if (parts.length > 1) {
      const splitAfter = parts[1].split('} else {');
      parts[1] = splitAfter[0] + insertText + splitAfter.slice(1).join('} else {');
      content = parts.join('reader.readAsText(file);');
    }
  }

  content = content.replace(/PNG\/JSON\/TXT\/DOCX\/TXT\/DOCX/g, 'PNG/JSON/TXT/DOCX');

  fs.writeFileSync('src/components/GroupInput.tsx', content);
}

patchCardInput();
patchComparisonInput();
patchGroupInput();
console.log("Done");
