const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /const filteredChannels = useMemo\(\(\) => \{\n\s+return displayChannels\.filter\(c => \{\n\s+const matchQ = !search \|\| c\.name\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\) \|\| c\.group\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\);\n\s+const matchG = !groupFilter \|\| c\.group === groupFilter;\n\s+return matchQ && matchG;\n\s+\}\);\n\s+\}, \[displayChannels, search, groupFilter\]\);/,
    `const filteredChannels = useMemo(() => {
    if (!displayChannels) return [];
    const lowerSearch = search.toLowerCase();
    return displayChannels.filter(c => {
      const matchQ = !lowerSearch || c.name.toLowerCase().includes(lowerSearch) || c.group.toLowerCase().includes(lowerSearch);
      const matchG = !groupFilter || c.group === groupFilter;
      return matchQ && matchG;
    });
  }, [displayChannels, search, groupFilter]);`
);

code = code.replace(
    /const filteredMovies = useMemo\(\(\) => \{\n\s+return movies\.filter\(m => \{\n\s+const matchQ = \(m\.name \|\| ''\)\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\);\n\s+const matchC = !vodCategoryFilter \|\| m\.category_id === vodCategoryFilter;\n\s+return matchQ && matchC;\n\s+\}\);\n\s+\}, \[movies, search, vodCategoryFilter\]\);/,
    `const filteredMovies = useMemo(() => {
    if (!movies) return [];
    const lowerSearch = search.toLowerCase();
    return movies.filter(m => {
      const matchQ = !lowerSearch || (m.name || '').toLowerCase().includes(lowerSearch);
      const matchC = !vodCategoryFilter || m.category_id === vodCategoryFilter;
      return matchQ && matchC;
    });
  }, [movies, search, vodCategoryFilter]);`
);

code = code.replace(
    /const filteredSeries = useMemo\(\(\) => \{\n\s+return seriesList\.filter\(s => \{\n\s+const matchQ = \(s\.name \|\| ''\)\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\);\n\s+const matchC = !vodCategoryFilter \|\| s\.category_id === vodCategoryFilter;\n\s+return matchQ && matchC;\n\s+\}\);\n\s+\}, \[seriesList, search, vodCategoryFilter\]\);/,
    `const filteredSeries = useMemo(() => {
    if (!seriesList) return [];
    const lowerSearch = search.toLowerCase();
    return seriesList.filter(s => {
      const matchQ = !lowerSearch || (s.name || '').toLowerCase().includes(lowerSearch);
      const matchC = !vodCategoryFilter || s.category_id === vodCategoryFilter;
      return matchQ && matchC;
    });
  }, [seriesList, search, vodCategoryFilter]);`
);

fs.writeFileSync('src/App.tsx', code);
