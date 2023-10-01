const ELEMENTS = [
    "Wind", "Ice", "Fire", "Earth", "Light", "Dark"
].map((name, index) => ({
    index,
    name,
    url: `./icons/${name}-${index}.png`
}));
