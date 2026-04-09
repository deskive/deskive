import { Helmet } from '@dr.pogodin/react-helmet';

export interface StructuredDataProps {
  data: Record<string, any> | Record<string, any>[];
}

export function StructuredData({ data }: StructuredDataProps) {
  const structuredData = Array.isArray(data) ? data : [data];

  return (
    <Helmet>
      {structuredData.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
