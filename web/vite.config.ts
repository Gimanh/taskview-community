import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
// import { transformWithEsbuild } from 'vite'
// import type { Plugin } from 'vite'

// function transpileArktype(): Plugin {
//   return {
//     name: 'transpile-arktype',
//     apply: 'build',
//     async transform(code, id) {
//       if (id.includes('@ark/') || id.includes('arktype')) {
//         const result = await transformWithEsbuild(code, id, {
//           target: 'es2020',
//           format: 'esm',
//         })
//         return { code: result.code, map: result.map }
//       }
//     },
//   }
// }

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    vue(),
    ui({
      ui: {
        // Nuxt UI reads `ui.tv` at runtime (createTV) but omits it from the AppConfigUI type.
        // Teach tailwind-merge our custom radius scale so `rounded-10`/`rounded-14` are
        // recognized and properly dedupe the component default radius inside `:ui` overrides
        // (no `!` needed). See main.css @theme --radius-10 / --radius-14.
        ...({
          tv: { twMergeConfig: { extend: { theme: { radius: ['10', '14'] } } } },
        } as object),
        inputTime: {
          slots: { base: 'text-base! rounded-10' },
          defaultVariants: {
            variant: 'soft'
          }
        },
        drawer: {
          slots: {
            container: 'pb-[calc(var(--tv-safe-area-inset-bottom)+16px)]'
          }
        },
        slideover: {
          slots: {
            content: 'py-safe',
          },
        },
        dashboardGroup: {
          base: 'py-safe',
        },
        dashboardPanel: {
          slots: {
            body: 'p-2! pb-[calc(var(--tv-safe-area-inset-bottom)+var(--tv-safe-area-inset-top)+64px)]! lg:pb-0!'
          },
        },
        modal: {
          variants: {
            fullscreen: {
              true: {
                content: 'py-safe',
              },
              false: {
                content: 'rounded-3xl ring-0',
              }
            }
          },
        },
        popover: {
          slots: {
            content: 'rounded-2xl'
          }
        },
        dashboardSearchButton: {
          slots: {
            base: 'rounded-xl',
          },
        },
        dashboardSearch: {
          variants: {
            fullscreen: {
              true: {
                // was too much close to the top with safe area
                input: 'mt-4'
              }
            }
          }
        },
        dashboardNavbar: {
          slots: {
            title: 'text-lg!',
          },
        },
        button: {
          slots: {
            base: 'cursor-pointer rounded-14',
          },
          defaultVariants: {
            size: 'xl',
          },
          variants: {
            size: {
              xl: {
                leadingIcon: 'size-4.5',
              },
              lg: {
                leadingIcon: 'size-4',
              },
              md: {
                leadingIcon: 'size-3.5',
              }
            }
          }
        },
        inputNumber: {
          defaultVariants: {
            variant: 'soft'
          }
        },
        input: {
          slots: {
            base: 'rounded-xl',
          },
          defaultVariants: {
            size: 'xl',
            variant: 'soft',
          },
          variants: {
            size: {
              xl: {
                base: 'px-3.5',
                leadingIcon: 'size-4.5',
                leading: 'ps-3.5'
              },
            }
          }
        },
        textarea: {
          defaultVariants: {
            size: 'xl',
          },
        },
        colors: {
          primary: 'green',
          neutral: 'zinc',
        },
        collapsible: {
          slots: {
            content: 'p-2',
          },
        },
        card: {
          slots: {
            root: 'rounded-3xl'
          }
        },
        pageCard: {
          slots: {
            container: 'sm:p-4'
          },
          variants: {
            variant: {
              taskview: {
                root: 'cursor-pointer shadow-sm bg-tv-ui-bg-elevated',
                container: 'sm:p-2 sm:px-4',
              },
            },

          },
        },
        select: {
          defaultVariants: {
            size: 'xl'
          },
          slots: {
            content: 'rounded-2xl',
            item: 'before:rounded-xl',
            base: 'rounded-xl'
          }
        },
        selectMenu: {
          slots: {
            content: 'rounded-2xl',
            item: 'rounded-xl hover:bg-accented/40 before:rounded-xl',
            base: 'rounded-xl'
          },
          defaultVariants: {
            variant: 'soft',
          },
        },
        checkbox: {
          slots: {
            base: 'ring-2',
            root: 'cursor-pointer'
          },
          variants: {
            size: {
              xl: {
                base: 'size-5',
                container: 'h-5',
              },
              lg: {
                base: 'size-4',
              }
            },
          },
          defaultVariants: {
            size: 'xl',
            color: 'primary',
          },
        },
      },
    }),
    // transpileArktype(),
  ],
  // build: {
  //   target: ['es2020', 'safari15'],
  // },
  // optimizeDeps: {
  //   include: ['arktype', '@ark/schema', '@ark/util'],
  //   esbuildOptions: {
  //     target: 'es2020',
  //   },
  // },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174
  }
})
