<?xml version="1.0" encoding="UTF-8"?>
<!--
     Copyright Jesse Andrews, 2005-2008
     http://overstimulate.com

     This file may be used under the terms of of the
     GNU General Public License Version 2 or later (the "GPL"),
     http://www.gnu.org/licenses/gpl.html

     Software distributed under the License is distributed on an "AS IS" basis,
     WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
     for the specific language governing rights and limitations under the
     License.
-->

<xsl:stylesheet version="1.0"
  xmlns:S3="http://s3.amazonaws.com/doc/2006-03-01/"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <table cellspacing="0" id="keylist">
    <thead>
      <tr>
        <th align="left">Key</th>
        <th align="left">Last Modified</th>
        <th align="left">Size</th>
        <th align="left" class="delete_button" width="80">Action</th>
      </tr>
    </thead>
    <tbody>
      <xsl:for-each select="S3:ListBucketResult/S3:CommonPrefixes">
        <tr class="s3dir">
          <td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Prefix"/></xsl:attribute><xsl:value-of select="S3:Prefix"/></a></td>
          <td colspan="3"></td>
        </tr>
      </xsl:for-each>
      <xsl:for-each select="S3:ListBucketResult/S3:Contents">
        <tr>
          <xsl:attribute name="key"><xsl:value-of select="S3:Key"/></xsl:attribute>
          <td><a><xsl:attribute name="href">/<xsl:value-of select="S3:Key"/></xsl:attribute><xsl:value-of select="S3:Key"/></a></td>
          <td><xsl:value-of select="S3:LastModified"/></td>
          <td><xsl:value-of select="S3:Size"/></td>
          <td class="actions"></td>
        </tr>
      </xsl:for-each>
    </tbody>
  </table>
</xsl:template>

</xsl:stylesheet>

