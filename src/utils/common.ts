export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

export async function asyncForEach (array: Array<any>, callback: any) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
}

export async function filters() {
    
}