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
              }
            }
          }
        },
        dashboardSearchButton: {
          slots: {
            base: 'rounded-lg',
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
            base: 'cursor-pointer',
          },
          defaultVariants: {
            size: 'xl',
          },
        },
        input: {
          slots: {
            base: 'rounded-lg',
          },
          defaultVariants: {
            size: 'xl',
          },
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
        pageCard: {
          variants: {
            variant: {
              taskview: {
                root: 'cursor-pointer shadow-sm bg-tv-ui-bg-elevated',
                container: 'sm:p-2 sm:px-4',
              },
            },

          },
        },
        checkbox: {
          slots: {
            base: 'ring-2 cursor-pointer',
          },
          variants: {
            size: {
              xl: {
                base: 'size-5',
                container: 'h-5',
              },
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
})
