import type { Attachment } from 'ai';

import { LoaderIcon } from './icons';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            <Dialog>
              <DialogTrigger asChild>
                <div role="button" className="cursor-pointer size-full">
                  {/* NOTE: it is recommended to use next/image for images */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={url}
                    src={url}
                    alt={name ?? 'An image attachment'}
                    className="rounded-md size-full object-cover transition-opacity hover:opacity-80"
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl p-0 h-[80vh] flex items-center justify-center bg-transparent border-none shadow-none">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={name ?? 'An image attachment'}
                    className="max-w-full max-h-full object-contain rounded-md"
                  />
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
