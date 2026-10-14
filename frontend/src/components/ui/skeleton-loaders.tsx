import { Skeleton } from './skeleton';
import { Card, CardContent } from './card';

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  // A generic skeleton that looks good for any table, creating visual rhythm
  const getCellClassName = (colIdx: number) => {
    // Actions are usually last, align right
    if (colIdx === cols - 1) return "px-4 py-4 text-right";
    // Status is usually second to last, align center
    if (colIdx === cols - 2) return "px-4 py-4 text-center";
    return "px-4 py-4";
  };

  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100 dark:border-white/5">
          {[...Array(cols)].map((_, colIdx) => {
            
            let cellContent;
            
            // Actions Column (Last)
            if (colIdx === cols - 1) {
              cellContent = <Skeleton className="h-8 w-16 ml-auto rounded-md" />;
            }
            // Status Column (Second to last)
            else if (colIdx === cols - 2) {
              cellContent = <Skeleton className="h-5 w-20 mx-auto rounded-full" />;
            }
            // Main identity column (usually 2nd or 3rd) - give it a stacked look
            else if (colIdx === 1 || (cols > 5 && colIdx === 2)) {
               // Use rowIndex to vary the width slightly for a natural look
               const topWidths = ['w-32', 'w-40', 'w-48', 'w-36'];
               const bottomWidths = ['w-24', 'w-20', 'w-32', 'w-28'];
               cellContent = (
                 <div className="space-y-2">
                   <Skeleton className={`h-4 ${topWidths[rowIndex % topWidths.length]}`} />
                   <Skeleton className={`h-3 ${bottomWidths[rowIndex % bottomWidths.length]}`} />
                 </div>
               );
            }
            // Other generic columns
            else {
               const genericWidths = ['w-16', 'w-24', 'w-20', 'w-28', 'w-32'];
               // Add colIdx to rowIndex so columns don't look identical in the same row
               const width = genericWidths[(rowIndex + colIdx) % genericWidths.length];
               cellContent = <Skeleton className={`h-4 ${width}`} />;
            }

            return (
              <td key={colIdx} className={getCellClassName(colIdx)}>
                {cellContent}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="p-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 grid grid-cols-2 gap-2 mb-4">
              <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-5 w-20" /></div>
              <div><Skeleton className="h-3 w-24 mb-1" /><Skeleton className="h-5 w-8" /></div>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function PlanCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="flex flex-col h-[380px] p-0">
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="w-8 h-8 rounded-md" />
            </div>
            <div className="mb-6 space-y-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-3 w-16 mb-2" />
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-8 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function StatCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </>
  );
}
