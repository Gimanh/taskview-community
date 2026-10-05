<template>
  <UDashboardPanel id="erp-monitoring">
    <template #header>
      <UDashboardNavbar :title="isProjectScope ? `${projectName} - ERP Budget Monitoring` : 'Corporate ERP Budget Monitoring & Cost Control'">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="isProjectScope"
              label="Sync ERP Actuals"
              icon="i-lucide-refresh-cw"
              color="primary"
              :loading="syncing"
              @click="syncErp"
            />
            <UButton
              label="ERP Connector Settings"
              icon="i-lucide-settings-2"
              variant="soft"
              color="neutral"
              @click="openConfigModal = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 lg:p-6">
        <div v-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
        </div>

        <template v-else>
          <!-- Project Scope View -->
          <div v-if="isProjectScope && projectBudget" class="flex flex-col gap-6">
            <!-- Cost Summary KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Allocated Budget</span>
                <div class="text-3xl font-extrabold text-default">
                  ${{ (projectBudget.allocatedBudget || 0).toLocaleString() }}
                </div>
                <div class="flex items-center gap-2 text-xs text-muted mt-1">
                  <span>Cost Center: <strong>{{ projectBudget.erpCostCenter }}</strong></span>
                </div>
              </div>

              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Actual Invoiced Spend</span>
                <div class="text-3xl font-extrabold text-blue-500">
                  ${{ (projectBudget.actualSpend || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Posted in General Ledger</span>
              </div>

              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Committed Spend (POs)</span>
                <div class="text-3xl font-extrabold text-amber-500">
                  ${{ (projectBudget.committedSpend || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Open Purchase Orders</span>
              </div>

              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Budget Variance (Remaining)</span>
                <div
                  class="text-3xl font-extrabold"
                  :class="projectBudget.variance >= 0 ? 'text-emerald-500' : 'text-red-500'"
                >
                  ${{ (projectBudget.variance || 0).toLocaleString() }}
                </div>
                <div class="flex items-center gap-1.5 text-xs font-semibold" :class="projectBudget.variance >= 0 ? 'text-emerald-500' : 'text-red-500'">
                  <UIcon :name="projectBudget.variance >= 0 ? 'i-lucide-check-circle' : 'i-lucide-alert-triangle'" class="size-4" />
                  {{ projectBudget.burnRatePercent }}% Cost Burn Rate
                </div>
              </div>
            </div>

            <!-- Visual Budget Consumption Bar -->
            <div class="p-5 rounded-2xl border border-default bg-elevated/30 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-default text-base">ERP Financial Commitment & Consumption</h4>
                  <span class="text-xs text-muted">WBS Element: <strong>{{ projectBudget.erpWbsElement }}</strong> • Last Synced: {{ formatDate(projectBudget.lastSyncedAt) }}</span>
                </div>
                <span class="text-xs font-bold px-2.5 py-1 rounded-full uppercase" :class="getHealthClass(projectBudget.status)">
                  {{ projectBudget.status }}
                </span>
              </div>

              <div class="w-full bg-default/20 rounded-full h-3 overflow-hidden flex">
                <div
                  class="bg-blue-500 h-full"
                  :style="{ width: `${Math.min(100, projectBudget.burnRatePercent)}%` }"
                  title="Actual Spend"
                />
                <div
                  class="bg-amber-500 h-full"
                  :style="{ width: `${Math.min(100 - projectBudget.burnRatePercent, (projectBudget.committedSpend / (projectBudget.allocatedBudget || 1)) * 100)}%` }"
                  title="Committed Spend"
                />
              </div>
              <div class="flex items-center justify-between text-xs text-muted">
                <div class="flex items-center gap-4">
                  <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-blue-500" /> Actual Spend (${{ projectBudget.actualSpend.toLocaleString() }})</span>
                  <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-amber-500" /> Committed POs (${{ projectBudget.committedSpend.toLocaleString() }})</span>
                  <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-emerald-500" /> Available Funds (${{ Math.max(0, projectBudget.variance).toLocaleString() }})</span>
                </div>
                <span>Total Pool: ${{ projectBudget.allocatedBudget.toLocaleString() }}</span>
              </div>
            </div>

            <!-- Inbound ERP Transactions Ledger -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-default text-base flex items-center gap-2">
                  <UIcon name="i-lucide-receipt" class="size-5 text-primary" />
                  ERP General Ledger & Purchase Order Records
                </h3>
                <UButton label="Post Manual Adjustment" icon="i-lucide-plus" size="xs" variant="soft" color="neutral" @click="openTxModal = true" />
              </div>

              <div class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
                <table class="w-full text-left text-sm">
                  <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                    <tr>
                      <th class="p-3">Reference Doc</th>
                      <th class="p-3">Vendor / Account</th>
                      <th class="p-3">Description</th>
                      <th class="p-3">Type</th>
                      <th class="p-3 text-right">Amount</th>
                      <th class="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default/50">
                    <tr v-for="tx in projectBudget.transactions" :key="tx.id" class="hover:bg-elevated/40">
                      <td class="p-3 font-mono font-semibold text-default text-xs">{{ tx.referenceDoc }}</td>
                      <td class="p-3 text-default">{{ tx.vendor || 'Corporate GL' }}</td>
                      <td class="p-3 text-muted text-xs">{{ tx.description }}</td>
                      <td class="p-3">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" :class="tx.transactionType === 'actual' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'">
                          {{ tx.transactionType }}
                        </span>
                      </td>
                      <td class="p-3 text-right font-bold text-default">
                        ${{ (tx.amount || 0).toLocaleString() }}
                      </td>
                      <td class="p-3 text-muted text-xs">{{ formatDate(tx.transactionDate) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Corporate Portfolio Scope View -->
          <div v-else class="flex flex-col gap-6">
            <!-- Org Cost Rollup KPIs -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Total Portfolio Allocation</span>
                <div class="text-3xl font-extrabold text-default">
                  ${{ (orgOverview?.summary?.totalAllocated || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Corporate Capex & Opex budget</span>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Total Actual Spend</span>
                <div class="text-3xl font-extrabold text-blue-500">
                  ${{ (orgOverview?.summary?.totalActual || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Invoiced & Settled in ERP</span>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Committed Spend</span>
                <div class="text-3xl font-extrabold text-amber-500">
                  ${{ (orgOverview?.summary?.totalCommitted || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">Contracted & open POs</span>
              </div>
              <div class="p-5 rounded-2xl border border-default bg-elevated/40 flex flex-col gap-1">
                <span class="text-xs uppercase font-semibold text-muted">Remaining Capital</span>
                <div class="text-3xl font-extrabold text-emerald-500">
                  ${{ (orgOverview?.summary?.totalVariance || 0).toLocaleString() }}
                </div>
                <span class="text-xs text-muted">{{ orgOverview?.summary?.burnRatePercent || 0 }}% Portfolio Burn Rate</span>
              </div>
            </div>

            <!-- Project Budgets Table -->
            <div class="flex flex-col gap-3">
              <h3 class="font-bold text-default text-base">Project ERP Cost Centers & WBS Allocations</h3>

              <div class="rounded-xl border border-default bg-elevated/20 overflow-hidden">
                <table class="w-full text-left text-sm">
                  <thead class="bg-elevated/50 text-xs text-muted border-b border-default uppercase">
                    <tr>
                      <th class="p-3">Project</th>
                      <th class="p-3">Cost Center</th>
                      <th class="p-3">WBS Element</th>
                      <th class="p-3 text-right">Allocated</th>
                      <th class="p-3 text-right">Actual Spend</th>
                      <th class="p-3 text-right">Committed</th>
                      <th class="p-3">Variance</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default/50">
                    <tr v-for="b in orgOverview?.budgets || []" :key="b.id" class="hover:bg-elevated/40">
                      <td class="p-3 font-semibold text-default">{{ b.projectName }}</td>
                      <td class="p-3 font-mono text-xs text-muted">{{ b.costCenter }}</td>
                      <td class="p-3 font-mono text-xs text-muted">{{ b.wbsElement }}</td>
                      <td class="p-3 text-right font-semibold text-default">${{ (b.allocatedBudget || 0).toLocaleString() }}</td>
                      <td class="p-3 text-right font-semibold text-blue-500">${{ (b.actualSpend || 0).toLocaleString() }}</td>
                      <td class="p-3 text-right font-semibold text-amber-500">${{ (b.committedSpend || 0).toLocaleString() }}</td>
                      <td class="p-3 font-semibold" :class="(b.allocatedBudget - (b.actualSpend + b.committedSpend)) >= 0 ? 'text-emerald-500' : 'text-red-500'">
                        ${{ (b.allocatedBudget - (b.actualSpend + b.committedSpend)).toLocaleString() }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- ERP Configuration Modal -->
        <UModal v-model:open="openConfigModal" title="Corporate ERP Connector Configuration">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div>
                <label class="text-xs font-medium text-muted">Enterprise ERP System</label>
                <select v-model="erpConfig.erpSystem" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                  <option value="sap">SAP S/4HANA / SAP ECC</option>
                  <option value="oracle_netsuite">Oracle NetSuite ERP</option>
                  <option value="dynamics365">Microsoft Dynamics 365 Finance</option>
                  <option value="generic_rest">Custom Corporate Financial REST Gateway</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-muted">ERP Gateway API Endpoint</label>
                <UInput v-model="erpConfig.apiUrl" placeholder="https://erp-gateway.internal.corp/api/v2" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">API Integration Key / OAuth Secret</label>
                <UInput v-model="erpConfig.apiKey" type="password" placeholder="••••••••••••••••" class="w-full mt-1" />
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Scheduled Sync Frequency</label>
                <select v-model="erpConfig.syncFrequency" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                  <option value="hourly">Hourly Automated Reconciliation</option>
                  <option value="daily">Daily Midnight Settlement (Default)</option>
                  <option value="weekly">Weekly Rollup</option>
                  <option value="manual">Manual On-Demand Sync</option>
                </select>
              </div>
              <div class="p-3 rounded-xl border border-default bg-elevated/30 flex flex-col gap-1">
                <span class="text-xs font-semibold text-default">Inbound ERP Webhook URL:</span>
                <span class="font-mono text-xs text-muted break-all">https://your-domain.com/module/erp/webhook</span>
                <span class="text-[11px] text-muted">Configure this webhook in SAP or NetSuite to stream real-time PO commitments and invoice settlements.</span>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openConfigModal = false" />
              <UButton label="Save ERP Settings" color="primary" @click="saveErpConfig" />
            </div>
          </template>
        </UModal>

        <!-- Post Manual Transaction Modal -->
        <UModal v-model:open="openTxModal" title="Post ERP Cost Adjustment">
          <template #body>
            <div class="flex flex-col gap-4 p-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Reference Doc #</label>
                  <UInput v-model="newTx.referenceDoc" placeholder="SAP-PO-9823" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Vendor / Payee</label>
                  <UInput v-model="newTx.vendor" placeholder="Vendor Name" class="w-full mt-1" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-muted">Amount ($)</label>
                  <UInput v-model.number="newTx.amount" type="number" class="w-full mt-1" />
                </div>
                <div>
                  <label class="text-xs font-medium text-muted">Transaction Type</label>
                  <select v-model="newTx.transactionType" class="w-full mt-1 rounded-lg border border-default p-2 text-sm bg-background">
                    <option value="actual">Actual Invoice Spend</option>
                    <option value="committed">Committed Purchase Order (PO)</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-xs font-medium text-muted">Description / Line Item Details</label>
                <UTextarea v-model="newTx.description" placeholder="Notes..." class="w-full mt-1" />
              </div>
            </div>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 p-4">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="openTxModal = false" />
              <UButton label="Post Transaction" color="primary" @click="postTransaction" />
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import $api from '@/helpers/axios'
import { useGoalsStore } from '@/stores/goals.store'
import TvCollapseSidebarDesktop from '@/components/features/base/TvCollapseSidebarDesktop.vue'

const route = useRoute()
const goalsStore = useGoalsStore()

const projectId = computed(() => Number(route.params.projectId))
const isProjectScope = computed(() => !!projectId.value && !isNaN(projectId.value))
const currentProject = computed(() => goalsStore.goals.find(g => g.id === projectId.value))
const projectName = computed(() => currentProject.value?.name || 'Project')

const loading = ref(false)
const syncing = ref(false)
const openConfigModal = ref(false)
const openTxModal = ref(false)

const projectBudget = ref<any>(null)
const orgOverview = ref<any>(null)

const erpConfig = ref({
  erpSystem: 'sap',
  apiUrl: 'https://erp-gateway.internal.net/api/v2',
  apiKey: '',
  syncFrequency: 'daily',
  isEnabled: true,
})

const newTx = ref({
  referenceDoc: 'SAP-INV-1092',
  vendor: 'Vendor Corp',
  amount: 5000,
  transactionType: 'actual' as 'actual' | 'committed',
  description: 'Supplemental services and tooling invoice',
})

function getHealthClass(status: string) {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/10 text-emerald-500'
    case 'warning': return 'bg-amber-500/10 text-amber-500'
    case 'critical': return 'bg-red-500/10 text-red-500'
    default: return 'bg-neutral-500/10 text-neutral-400'
  }
}

function formatDate(val: any) {
  if (!val) return ''
  return new Date(val).toLocaleDateString()
}

async function loadData() {
  loading.value = true
  try {
    if (isProjectScope.value) {
      const res = await $api.get(`/module/erp/projects/${projectId.value}`)
      projectBudget.value = res.data?.response
    } else {
      const res = await $api.get('/module/erp/overview')
      orgOverview.value = res.data?.response
    }

    const cfgRes = await $api.get('/module/erp/config')
    if (cfgRes.data?.response) {
      erpConfig.value = { ...erpConfig.value, ...cfgRes.data.response }
    }
  } catch (err) {
    console.error('Failed to load ERP budget data:', err)
  } finally {
    loading.value = false
  }
}

async function syncErp() {
  if (!projectId.value) return
  syncing.value = true
  try {
    const res = await $api.post(`/module/erp/projects/${projectId.value}/sync`)
    alert(res.data?.response?.message || 'ERP sync complete')
    await loadData()
  } catch (err) {
    console.error('Failed to sync from ERP:', err)
  } finally {
    syncing.value = false
  }
}

async function saveErpConfig() {
  try {
    await $api.post('/module/erp/config', erpConfig.value)
    openConfigModal.value = false
    alert('ERP configuration saved successfully.')
  } catch (err) {
    console.error('Failed to save ERP config:', err)
  }
}

async function postTransaction() {
  if (!projectBudget.value?.id) return
  try {
    await $api.post(`/module/erp/budgets/${projectBudget.value.id}/transactions`, newTx.value)
    openTxModal.value = false
    await loadData()
  } catch (err) {
    console.error('Failed to post ERP transaction:', err)
  }
}

onMounted(() => {
  loadData()
})
</script>
