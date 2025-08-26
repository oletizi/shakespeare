# Understanding TypeScript Generics

TypeScript generics provide a way to create reusable components that can work with multiple types. Instead of working with a specific type, generics allow you to write code that can work with any type while maintaining type safety.

## Basic Usage

The most basic use of generics is with functions:

```typescript
function identity<T>(arg: T): T {
    return arg;
}
```

This function will return whatever is passed to it. The type parameter T allows TypeScript to track the type through the function.

## Common Use Cases

1. Arrays and Collections
```typescript
function firstElement<T>(arr: T[]): T | undefined {
    return arr[0];
}
```

2. Generic Interfaces
```typescript
interface Container<T> {
    value: T;
    getValue(): T;
}
```

## Best Practices

- Use meaningful names for type parameters
- Constrain types when necessary using extends
- Don't overuse generics - sometimes specific types are better

## Examples

Here's a practical example:

```typescript
interface ApiResponse<T> {
    data: T;
    status: number;
    message: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url);
    return await response.json();
}
```

This example shows how generics can make your code more flexible while maintaining type safety.
