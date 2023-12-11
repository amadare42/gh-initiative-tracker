import jsonPath, { PathComponent } from 'jsonpath';

type AddPatchOp = {
    op: 'add',
    path: string,
    value: any
};

export type PatchOp = AddPatchOp | {
    op: 'remove',
    path: string
} | {
    op: 'replace',
    path: string,
    value: any
} | {
    op: 'test',
    path: string,
    value: any
};

function remove(obj: any, path: PathComponent[]) {
    const arrayParent = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -2)));
    const array = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -1)));
    if (!Array.isArray(array)) {
        throw new Error('Expected array for path ' + jsonPath.stringify(path.slice(0, -1)));
    }
    const idx = path.at(-1) as number;
    if (typeof idx !== 'number') {
        throw new Error('Expected number for path ' + jsonPath.stringify(path.slice(0, -1)));
    }
    const element = array[idx];
    arrayParent[path.at(-2)] = [...array.slice(0, idx), ...array.slice(idx + 1)];
    return element;
}

function add(pointingToArrayEnd: boolean, obj: any, path: PathComponent[], patchOp: AddPatchOp) {
    if (pointingToArrayEnd) {
        const arrayParent = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -1)));
        const array = jsonPath.value(obj, jsonPath.stringify(path));
        if (!Array.isArray(array)) {
            throw new Error('Expected array for path ' + jsonPath.stringify(path.slice(0, -1)));
        }
        arrayParent[path.at(-1)] = [...array, patchOp.value];
        return
    }

    const arrayParent = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -2)));
    const array = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -1)));
    if (!Array.isArray(array)) {
        throw new Error('Expected array for path ' + jsonPath.stringify(path.slice(0, -1)));
    }
    const idx = path.at(-1) as number;
    if (typeof idx !== 'number') {
        throw new Error('Expected number for path ' + jsonPath.stringify(path.slice(0, -1)));
    }
    arrayParent[path.at(-2)] = [...array.slice(0, idx), patchOp.value, ...array.slice(idx)];
}

function replace(obj: any, path: PathComponent[], patchOp: { op: 'replace'; path: string; value: any }) {
    const parent = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -1)));
    if (!Array.isArray(parent)) {
        parent[path.at(-1)] = patchOp.value;
    } else {
        const grandParent = jsonPath.value(obj, jsonPath.stringify(path.slice(0, -2)));
        const idx = path.at(-1) as number;
        if (typeof idx !== 'number') {
            throw new Error('Expected number for path ' + jsonPath.stringify(path.slice(0, -1)));
        }
        grandParent[path.at(-2)] = [...parent.slice(0, idx), patchOp.value, ...parent.slice(idx + 1)];
    }
}

export function performPatch(obj: any, ...patches: PatchOp[]) {
    let shouldStop = false;
    for (let patchOp of patches) {
        if (shouldStop) {
            break;
        }
        let patchOpPath = patchOp.path;
        let pointingToArrayEnd = patchOp.path.endsWith('[-]');
        if (pointingToArrayEnd) {
            patchOpPath = patchOp.path.slice(0, -3);
        }
        const nodes = jsonPath.nodes(obj, patchOpPath) || [];
        for (let { value, path } of nodes) {
            switch (patchOp.op) {
                case 'remove': {
                    remove(obj, path);
                    break;
                }

                case 'add': {
                    add(pointingToArrayEnd, obj, path, patchOp);
                    break;
                }

                case 'replace': {
                    replace(obj, path, patchOp);
                    break;
                }

                case 'test': {
                    const value = jsonPath.value(obj, jsonPath.stringify(path));
                    shouldStop = JSON.stringify(value) !== JSON.stringify(patchOp.value);

                    break;
                }
            }
        }
    }

    return obj;
}
