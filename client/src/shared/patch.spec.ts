import { performPatch } from './patch';


describe('patching', () => {
    it('[remove] removes array element by creating new array', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'remove',
            path: '$.array[1]'
        }]);
        expect(result).toStrictEqual({
            array: [1, 3]
        })
        expect(result.array).not.toBe(array);
    })
    it('[remove] removes array element by creating new array (last)', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'remove',
            path: '$.array[2]'
        }]);
        expect(result).toStrictEqual({
            array: [1, 2]
        })
        expect(result.array).not.toBe(array);
    })
    it('[remove] removes array element by creating new array (first)', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'remove',
            path: '$.array[0]'
        }]);
        expect(result).toStrictEqual({
            array: [2, 3]
        })
        expect(result.array).not.toBe(array);
    })
    it('[remove] removes array element by creating new array (predicate)', () => {
        let array = [{ idx: 1 }, { idx: 2 }, { idx: 3 }];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'remove',
            path: '$.array[?(@.idx==2)]'
        }]);
        expect(result).toStrictEqual({
            array: [{ idx: 1 }, { idx: 3 }]
        })
        expect(result.array).not.toBe(array);
    })
    it('[add] array element by creating new array by index', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'add',
            path: '$.array[1]',
            value: 42
        }]);
        expect(result).toStrictEqual({
            array: [1, 42, 2, 3]
        })
        expect(result.array).not.toBe(array);
    })
    it('[add] array element by creating new array to end', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'add',
            path: '$.array[-]',
            value: 42
        }]);
        expect(result).toStrictEqual({
            array: [1, 2, 3, 42]
        })
        expect(result.array).not.toBe(array);
    })
    it('[add] array element by creating new array to end (empty)', () => {
        let array = [];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'add',
            path: '$.array[-]',
            value: 42
        }]);
        expect(result).toStrictEqual({
            array: [42]
        })
        expect(result.array).not.toBe(array);
    })

    it('[replace] value without recreating parent object', () => {
        let obj = {
            field: 42
        }
       const { result } = performPatch(obj, [{
            op: 'replace',
            path: '$.field',
            value: 43
        }]);
        expect(result).toStrictEqual({
            field: 43
        })
        expect(result).toBe(obj);
    });
    it('[replace] replaces value by creating new array', () => {
        let array = [1, 2, 3];
        const obj = {
            array
        }
       const { result } = performPatch(obj, [{
            op: 'replace',
            path: '$.array[1]',
            value: 42
        }]);
        expect(result).toStrictEqual({
            array: [1, 42, 3]
        })
        expect(result.array).not.toBe(array);
    })
    it('[test] stops execution if test fails', () => {
        let obj = {
            field: 1
        }
       const { result } = performPatch(obj, [{
            op: 'replace',
            path: '$.field',
            value: 2
        }, {
            op: 'test',
            path: '$.field',
            value: 3
        }, {
            op: 'replace',
            path: '$.field',
            value: 4
        }]);
        expect(result).toStrictEqual({
            field: 2
        })
        expect(result).toBe(obj);
    });

    it('[test] should return isTestFailed=true if test fails', () => {
        let obj = {
            field: 1
        }
       const { isTestFailed } = performPatch(obj, [{
            op: 'test',
            path: '$.field',
            value: 2
        }]);
        expect(isTestFailed).toBe(true);
    });
})
