declare module '*.gql' {
  import type { DocumentNode } from '@apollo/client';
  const value: DocumentNode;
  export default value;
}
