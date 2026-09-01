import Image from "next/image";

type Props = {
  variant?: "sidebar" | "header";
};

export function BrandLogo({ variant = "sidebar" }: Props) {
  if (variant === "header") {
    return (
      <a href="/" className="flex min-w-0 items-center justify-center">
        <Image
          src="/marca/logo-canto-do-sabia.png"
          alt="Residencial Canto do Sabiá"
          width={413}
          height={263}
          className="h-9 w-auto max-w-[9.5rem] object-contain object-center"
          priority
        />
      </a>
    );
  }

  return (
    <a href="/" className="mb-4 flex flex-col items-center gap-1.5 px-1">
      <Image
        src="/marca/logo-canto-do-sabia.png"
        alt="Residencial Canto do Sabiá"
        width={413}
        height={263}
        className="h-auto w-full max-w-[10.5rem] object-contain"
        priority
      />
      <p className="text-xs text-muted">Código 132</p>
    </a>
  );
}
